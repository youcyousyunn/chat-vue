import Vue from 'vue'
import ak from '@/common/ak.js'
import { serverSendMsg, clientSendMsg } from '@/api/api.js'

const state =  {
    socket: null,
    serverChat: {
        serverChatId: Number.parseInt(Date.now() + Math.random()),
        serverChatName: '小爱',
        avatarUrl: '/static/image/im_server_avatar.png'
    },
    selectedChat: null, // 选取的会话对象
    currentChatList: [
        // {clientChatId: 10, clientChatName:'秋香'}
    ], // 当前chat实体集合
    notificationChatList: [], // 通知chat实体集合
    haveNewMsgDelegate: null // 当前已选中的用户含有新消息
}

const mutations = {
    /**
     * 触发当前选择的chat含有新的消息
     */
    triggerHaveNewMsgDelegate: function(state, payload) {
        state.haveNewMsgDelegate = Date.now();
    },

    /**
     * 排序当前会话列表
     */
    sortCurrentChatlist: function(state, payload) {
        var chatList = state.currentChatList.concat()

        // 排序规则：
        // 1-已关注放最前面，关注状态下按最后一条获取时间正序;
        // 2-非关注状态下，按最后一条获取时间正序

        // 1.首先按最后一次更新时间排序
        for (var i = 0; i < chatList.length; i++) {
            for (var j = i; j < chatList.length; j++) {
                var iTimeSpan = Date.parse(chatList[i].lastMsgTime)
                var jTimeSpan = Date.parse(chatList[j].lastMsgTime)
                if (iTimeSpan < jTimeSpan) {
                    var tmp = chatList[i]
                    chatList[i] = chatList[j]
                    chatList[j] = tmp
                }
            }
        }

        // 2.已关注的排在最前面并按最后一次时间倒序
        var followEnlist = []
        var unfollowEnlist = []
        for (var i = 0; i < chatList.length; i++) {
            var en = chatList[i]
            if (en.isFollow) {
                followEnlist.push(en)
            } else {
                unfollowEnlist.push(en)
            }
        }

        // 3.合并
        state.currentChatList = followEnlist.concat(unfollowEnlist);
    },

    /**
     * 清除通知chat
     */
    clearNotificationChat: function(state) {
        state.notificationChatList = [];
    }
}

const actions = {
    /**
     * 服务端上线
     */
    SERVER_ON: function(context, payload) {
        state.serverChat = {
            serverChatId: payload.serviceId,
            serverChatName: payload.serviceName,
            avatarUrl: '/static/image/im_server_avatar.png'
        }
    },

    /**
     * 服务端离线
     */
    SERVER_OFF: function(context, payload) {
        state.serverChat = null
    },

    /**
     * 客户端上线
     */
    CLIENT_ON: function(context, payload) {
        // 增加客户列表
        context.dispatch('addClientChat', {
            newChat: {
                clientChatId: payload.clientId,
                clientChatName: payload.clientName
            }
        })
    },

    /**
     * 客户端发送了消息
     */
    CLIENT_SEND_MSG: function(context, payload) {
        context.dispatch('addChatMsg', {
            clientChatId: payload.clientId,
            msg: payload
        })
    },

    /**
     * 客户端离线
     */
    CLIENT_OFF: function(context, payload) {
        // 1.修改客户状态为离线
        context.dispatch('extendChat', {
            clientChatId: payload.clientChat.clientChatId,
            extends: {
                state: 'off'
            }
        })

        // 2.添加消息
        context.dispatch('addChatMsg', {
            clientChatId: payload.clientChat.clientChatId,
            msg: {
                role: 'sys',
                contentType: 'text',
                content: '客户断开连接'
            }
        });
    },

    /**
     * 添加客户端chat对象
     */
    addClientChat: function(context, { newChat }) {
        context.dispatch('getChatByChatId', { clientChatId: newChat.clientChatId }).then((chat) => {
            if (chat == null) {
                // 1,公共属性
                newChat.msgList = [];
                newChat.state = 'on';
                newChat.accessTime = new Date(); // 访问时间
                newChat.inputContent = ''; // 输入框内容
                newChat.newMsgCount = 0;
                newChat.isFollow = false; // 是否关注
                newChat.lastMsgTime = null;
                newChat.lastMsgShowTime = null; // 最后一个消息的显示时间
                context.state.currentChatList.push(newChat);
            }

            // 2,增加消息
            context.dispatch('addChatMsg', {
                clientChatId: newChat.clientChatId,
                msg: {
                    role: 'sys',
                    contentType: 'text',
                    content: chat == null ? '新客户接入' : '重新连接'
                }
            });
        });
    },

    /**
     * 根据会话ID获取客户端对象
     */
    getChatByChatId: function(context, { clientChatId, listName }) {
        var chat = null
        if (listName) {
            // 1.指定了列表
            var targetList = context.state[listName]
            for (var i = 0; i < targetList.length; i++) {
                var tmpEn = targetList[i]
                if (tmpEn.clientChatId === clientChatId) {
                    chat = tmpEn
                    break
                }
            }
        } else {
            // 2.未指定列表
            for (var i = 0; i < context.state.currentChatList.length; i++) {
                var tmpEn = context.state.currentChatList[i]
                if (tmpEn.clientChatId === clientChatId) {
                    chat = tmpEn
                    break
                }
            }
        }

        return chat
    },

    /**
     * 添加客户端对象的MSG
     */
    addChatMsg: function(context, { clientChatId, msg, successCallback }) {
        context.dispatch('getChatByChatId', { clientChatId: clientChatId }).then((chat) => {
            if (chat == null) {
                return
            }
            // 1.消息设定
            var msgList = chat.msgList ? chat.msgList : []
            msg.createTime = msg.createTime == undefined ? new Date() : msg.createTime
            msg.createTime = new Date(msg.createTime)
            if (chat.lastMsgShowTime == null || msg.createTime.getTime() - chat.lastMsgShowTime.getTime() > 1000 * 60 * 5) { // 插入日期, 在消息上方是否显示时间是由后台传递给前台的消息中附加上的，可参考微信Web版
                msgList.push({
                    role: 'sys',
                    contentType: 'text',
                    content: ak.Utils.getDateTimeStr(msg.createTime, 'H:i')
                })
                chat.lastMsgShowTime = msg.createTime
            }

            switch(msg.role) { // 根据角色转换头像属性
                case 'SERVER':
                    msg.avatarUrl = msg.serviceAvatarUrl
                    break
                case 'CLIENT':
                    msg.avatarUrl = msg.clientAvatarUrl
                    break
                default:
                    break
            }

            // 2.插入消息
            msgList.push(msg)

            // 3.设置chat对象相关属性
            chat.msgList = msgList
            chat.lastMsgTime = msg.createTime
            switch (msg.contentType) {
                case 'text':
                    chat.lastMsgContent = msg.content
                    break
                case 'image':
                    chat.lastMsgContent = '[图片]'
                    break
                case 'file':
                    chat.lastMsgContent = '[文件]'
                    break
                case 'sound':
                    chat.lastMsgContent = '[语音]'
                    break
            }

            // 4.更新chat列表
            if (context.state.selectedChat && chat.clientChatId == context.state.selectedChat.clientChatId) {
                chat.newMsgCount = 0
                context.state.selectedChat = Object.assign({}, chat)
                context.commit('triggerHaveNewMsgDelegate')
            } else {
                chat.newMsgCount++
            }

            // 5.排序chat列表
            context.commit('sortCurrentChatlist', {})

            // 6.加入通知
            // if (msg.role == 'CLIENT' && msg.contentType != 'preInput') {
                context.dispatch('addNotificationChat', {
                    chat: chat,
                    oprType: 'msg'
                })
            // }

            // 7.回调
            successCallback && successCallback()
        });
    },

    /**
     * 添加通知chat
     */
    addNotificationChat: function(context, { chat, oprType }) {
        var state = context.state
        // 当前的路由是否在im模块里，若不在im模块里，才显示通知
        if (window.polkVue.$route.name === 'im') {
            return
        }

        // 1.判断当前通知集合里是否已存在次会话，若已存在去除此会话
        for (var i = 0; i < state.notificationChatList.length; i++) {
            if (state.notificationChatList[i].clientChatId == chat.clientChatId) {
                state.notificationChatList.splice(i, 1)
                break
            }
        }

        // 2.集合最多只能有5个
        if (state.notificationChatList.length > 5) {
            state.notificationChatList = state.notificationChatList.splice(4)
        }

        // 3.转换后加入到当前通知集合里
        var tmpChatEn = {
            clientChatId: chat.clientChatId,
            sourceInfo_way: chat.sourceInfo_way,
            site: window.location.host
        };
        if (oprType == 'chat') {
            tmpChatEn.title = '新用户'
            tmpChatEn.content = '客户 ' + chat.clientChatName + ' 接入新会话'
        } else if (oprType == 'msg') {
            tmpChatEn.title = '客户 ' + chat.clientChatName + ' ' + chat.newMsgCount + '条新消息'
            tmpChatEn.content = chat.lastMsgContent
        }

        // 4.内容大于25个截断
        if (tmpChatEn.content.length > 25) {
            tmpChatEn.content = tmpChatEn.content.substr(0, 24) + '...'
        }

        // 5.加入到集合里
        state.notificationChatList.push(tmpChatEn)

        // 6.当通知数量大于5个时清除通知
        window.serverStore_notificationList = window.serverStore_notificationList || []
        if (window.serverStore_notificationList.length > 5) {
            window.serverStore_notificationList.forEach((item, index) => {
                item.close()
            })
            window.serverStore_notificationList = []
        }

        // 7.显示通知
        for (var i = 0; i < state.notificationChatList.length; i++) {
            const item = state.notificationChatList[i]
            // 1)已存在的通知列表是否包含此会话，若存在就关闭并移除
            for (var j = 0; j < window.serverStore_notificationList.length; j++) {
                if (window.serverStore_notificationList[j].data == item.clientChatId) {
                    window.serverStore_notificationList[j].close()
                    break
                }
            }

            // 2)创建新的通知
            const notification = new Notification(item.title, {
                body: item.content,
                data: item.clientChatId,
                tag: Date.now(),
                icon: ak.BLL.getPngFromWay(item.sourceInfo_way)
            })
            notification.onclick = function(e) {
                window.focus()
                window.polkVue.$router.push('im')
                context.commit('clearNotificationChat')
                context.dispatch('selectChat', { clientChatId: item.clientChatId })
                notification.close()
                serverStore_notificationList = []
            }

            notification.onclose = function(e) {
                // remove en
                for (var i = 0; i < state.notificationChatList.length; i++) {
                    if (state.notificationChatList[i].clientChatId == item.clientChatId) {
                        state.notificationChatList.splice(i, 1)
                        break
                    }
                }
                // remove notification
                for (var i = 0; i < window.serverStore_notificationList.length; i++) {
                    if (window.serverStore_notificationList[i].tag == notification.tag) {
                        window.serverStore_notificationList.splice(i, 1)
                        break
                    }
                }
            }

            setTimeout(function() {
                notification && notification.close()
            }, 1000 * 10)

            window.serverStore_notificationList.push(notification)
        }
    },

    /**
     * 修改客户状态
     */
    extendChat: function(context, payload) {
        return context.dispatch('getChatByChatId', { clientChatId: payload.clientChatId }).then((chat) => {
            // 1.若没有，就附加到当前会话列表里
            if (chat == null) {
                return
            }

            // 2.extend属性
            for (var key in payload.extends) {
                Vue.set(chat, key, payload.extends[key])
            }

            // 3.若选中的当前chatEn 与 传入的一致，则更新选中额chatEn
            if (context.state.selectedChat && context.state.selectedChat.clientChatId == chat.clientChatId) {
                context.state.selectedChat = Object.assign({}, chat)
                Vue.nextTick(function() {})
            }

            return chat
        });
    },

    /**
     * 选中聊天chat
     */
    selectChat: function(context, { clientChatId }) {
        context.dispatch('getChatByChatId', { clientChatId: clientChatId }).then((chat) => {
            var state = context.state
            chat.newMsgCount = 0 // 设置新消息为0
            // 1.设置当前选中的会话
            context.state.selectedChat = Object.assign({}, chat)

            // 2.刷新当前会话集合
            for (var i = 0; i < state.currentChatList.length; i++) {
                var tmp = state.currentChatList[i]
                if (tmp.clientChatId === chat.clientChatId) {
                    state.currentChatList[i] = state.selectedChat
                    break
                }
            }
        });
    },

    /**
     * 客服发送消息
     */
    serverSendMsg: function(context, payload) {
        serverSendMsg(payload.msg).then(res => {
            console.log('发送成功')
        })
    },

    /**
     * 客户端发送消息
     */
    clientSendMsg: function(context, payload) {
        clientSendMsg(payload.msg).then(res => {
            console.log('发送成功')
        })
    }
}

export default {
    namespaced: true,
    state,
    mutations,
    actions
}
