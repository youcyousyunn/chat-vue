<!-- 客户端 入口 -->
<template>
    <div class="imClient-wrapper">
        <div class="imClient-inner">
            <header class="imClient-header">
                <div class="name-wrapper position-v-mid">
                    <span v-if="chatInfo.chatState == 'robot'">Vue在线客服-访客端</span>
                    <span v-else-if="chatInfo.chatState == 'agent'">您正在与客服{{serverChat.serverChatName}}对话</span>
                </div>
                <div class="opr-wrapper position-v-mid">
                    <el-tooltip content="评分" placement="bottom" effect="light">
                        <i class="fa fa-star-half-full" @click="showRateDialog()"></i>
                    </el-tooltip>
                    <el-tooltip content="留言" placement="bottom" effect="light">
                        <i class="fa fa-envelope-o" @click="showLeaveDialog()"></i>
                    </el-tooltip>
                    <el-tooltip content="结束会话" placement="bottom" effect="light">
                        <i class="fa fa-close" @click="closeChat()"></i>
                    </el-tooltip>
                </div>
            </header>
            <main class="imClient-main">
                <!-- 聊天框 -->
                <div class="item imClientChat-wrapper">
                    <!-- 聊天记录 -->
                    <common-chat ref="common_chat" :chatInfo="chatInfo" :oprRoleName=" 'CLIENT'" @sendMsg="sendMsg" @chatServiceCallback="chatCallback"></common-chat>
                </div>
                <!-- 信息区域 -->
                <div class="item imClientInfo-wrapper">
                    <article class="imClientInfo-notice-wrapper">
                        <header class="imClientInfo-item-header">
                            公告
                        </header>
                        <main class="imClientInfo-notice-main">
                            <p class="link">github：
                                <a href="https://github.com/polk6/chat" target="_blank">项目所在github地址</a>
                            </p>
                            <p class="link">抽奖：
                                <a href="https://i.csdn.net/#/uc/draw" target="_blank">https://i.csdn.net/#/uc/draw</a>
                            </p>
                        </main>
                    </article>
                    <!-- 常见问题 -->
                    <article class="imClientInfo-faq-wrapper">
                        <header class="imClientInfo-item-header">
                            常见问题
                        </header>
                        <main class="imClientInfo-faq-main">
                            <el-collapse v-model="faqSelected" accordion>
                                <el-collapse-item v-for="(faqItem, index) in faqList" :key="index" :name="index" :title="faqItem.title">
                                    <div v-html="faqItem.content"></div>
                                </el-collapse-item>
                            </el-collapse>
                        </main>
                    </article>
                </div>
            </main>
        </div>
        <!-- 满意度dialog -->
        <el-dialog :visible.sync="rateDialogVisible" :close-on-press-escape="false">
            <im-rate ref="im_rate"></im-rate>
        </el-dialog>
        <!-- 离线留言dialog -->
        <el-dialog :visible.sync="leaveDialogVisible" :close-on-press-escape="false">
            <im-leave ref="im_leave"></im-leave>
        </el-dialog>
        <!-- 结束会话dialog -->
        <el-dialog :visible.sync="logoutDialogVisible" :close-on-press-escape="false">
            <p class="title">结束本次会话？</p>
            <div class="footer">
                <el-button type="primary" @click="logoutDialog_cancel">取消</el-button>
                <el-button type="primary" @click="logoutDialog_submit">结束会话</el-button>
            </div>
        </el-dialog>
    </div>
</template>

<script >
import commonChat from '@/components/common/common_chat.vue';
import imRate from './rate.vue';
import imLeave from './leave.vue';
import imTransfer from './transfer.vue';

export default {
    components: {
        commonChat: commonChat,
        imRate: imRate,
        imLeave: imLeave,
        imTransfer: imTransfer
    },
    data() {
        return {
            socket: null,
            chatInfo: { // 会话信息，包括聊天记录、状态
                chatState: 'robot', // chat状态；robot 机器人、agent 客服
                inputContent: '', // 输入框内容
                msgList: [], // 消息列表
                state: 'on', // 连接状态;on ：在线；off：离线
                lastMsgShowTime: null // 最后一个消息的显示时间
            }, 
            clientChat: { // 当前账号的信息
                clientChatId: '',
                clientChatName: '',
                avatarUrl: '/static/image/im_client_avatar.png'
            },
            serverChat: { // 服务端chat信息
                serverChatId: '',
                serverChatName: '',
                avatarUrl: '/static/image/im_server_avatar.png'
            }, 
            robot: { // 机器人信息
                robotName: '小旺',
                avatarUrl: '/static/image/im_robot_avatar.png'
            }, 
            faqList: [ // 常见问题一览
                { title: '活动页面地址', content: '<a href="https://i.csdn.net/#/uc/draw" target="_blank">https://i.csdn.net/#/uc/drawm</a>' },
                { title: '促销活动日', content: '2020-05-01' },
            ],
            faqSelected: '-1',
            inputContent_setTimeout: null, // 输入文字时在输入结束才修改具体内容
            selectionRange: null, // 输入框选中的区域
            shortcutMsgList: [], // 聊天区域的快捷回复列表
            logoutDialogVisible: false, // 结束会话显示
            rateDialogVisible: false, // 评价dialog
            leaveDialogVisible: false // 留言dialog
        }
    },
    created() {
    },
    mounted() {
        this.guide();
    },
    computed: {
    },
    watch: {},
    methods: {
        /**
         * 引导消息
         */
        guide: function() {
            // 模拟消息
            this.addChatMsg({
                role: 'robot',
                avatarUrl: this.robot.avatarUrl,
                contentType: 'transformServer'
            })
        },

        /**
         * 添加chat对象的msg
         */
        addChatMsg: function(msg, successCallback) {
            // 1.设定默认值
            msg.role = msg.role == undefined ? 'sys' : msg.role
            msg.contentType = msg.contentType == undefined ? 'text' : msg.contentType
            msg.createTime = msg.createTime == undefined ? new Date() : msg.createTime

            var msgList = this.chatInfo.msgList ? this.chatInfo.msgList : []

            // 2.插入消息
            msg.createTime = new Date(msg.createTime)
            if (this.chatInfo.lastMsgShowTime == null || msg.createTime.getTime() - this.chatInfo.lastMsgShowTime.getTime() > 1000 * 60 * 5) {
                msgList.push({
                    role: 'sys',
                    contentType: 'text',
                    content: this.$ak.Utils.getDateTimeStr(msg.createTime, 'Y-m-d H:i:s')
                })
                this.chatInfo.lastMsgShowTime = msg.createTime
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
            msgList.push(msg)

            // 3.设置chat对象相关属性
            this.chatInfo.msgList = msgList

            // 4.回调
            successCallback && successCallback()
        },

        /**
         * 转接客服回调
         */
        chatCallback: function(rs) {
            if (rs.eventType == 'transformServer') {
                this.chatInfo.chatState = 'agent';
                this.regSocket();
            }
        },

        /**
         * 注册socket
         */
        regSocket: function() {
            // WebSocket与普通的请求所用协议有所不同，ws等同于http，wss等同于https           
            const accountId = Math.ceil(Math.random() * 10);     
            console.log('账号：' + accountId)
            this.socket = new WebSocket("ws://192.168.199.233:8088/community/socket/" + 10);
			this.socket.onopen = this.websocketonopen
			this.socket.onerror = this.websocketonerror
			this.socket.onmessage = this.websocketonmessage
			this.socket.onclose = this.websocketclose
        },
        websocketonopen: function () {
            console.log("WebSocket连接成功")
		},    
		websocketonerror: function (e) {
			console.log("WebSocket连接发生错误" + e)
		},              
		websocketonmessage: function (e) {
            const data = JSON.parse(e.data)
            if(data.status === 'OPEN') { // 客户端上线
                this.serverChat = {
                    serverChatId: data.serviceId,
                    serverChatName: data.serviceName,
                    avatarUrl: data.serviceAvatarUrl  === undefined ? this.serverChat.avatarUrl : data.serviceAvatarUrl
                }
                this.clientChat = {
                    clientChatId: data.clientId,
                    clientChatName: data.clientName,
                    avatarUrl: data.clientAvatarUrl  === undefined ? this.clientChat.avatarUrl : data.clientAvatarUrl
                }
                // 添加消息
                this.addChatMsg({
                    role: 'sys',
                    contentType: 'text',
                    content: '客服 ' + this.serverChat.serverChatName + ' 为你服务'
                })
            } else {
                this.addChatMsg(data, () => {
                    this.$refs.common_chat.goEnd()
                })
            }
		},      
		websocketclose: function (e) {
			console.log("connection closed ")
        },

        /**
         * 发送消息
         */
        sendMsg: function(rs) {
            const msg = {
                clientId: this.clientChat.clientChatId,
                role: 'CLIENT',
                serviceId: this.serverChat.serverChatId,
                clientAvatarUrl: this.clientChat.avatarUrl,
                content: rs.msg.content,
                contentType: rs.msg.contentType
            }
            // 1.发送消息
            if (this.chatInfo.chatState == 'robot') {
                // 机器人发送接口
            } else if (this.chatInfo.chatState == 'agent') {
                // 客服接口
                this.$store.dispatch('chat/clientSendMsg', {msg})
            }
            // 2.添加消息到消息集合
            var self = this
            this.addChatMsg(msg, function() {
                self.goEnd();
            });
        },

        /**
         * 结束会话
         */
        closeChat: function() {
            if (this.chatInfo.chatState == 'agent') {
                this.$store.dispatch('chat/CLIENT_OFF',  {
                    clientChat: this.clientChat,
                    serverChatId: this.serverChat.serverChatId
                })
                this.socket.onclose();
                this.chatInfo.state = 'off';
            }
        },

        /**
         * 注销dialog_提交
         */
        logoutDialog_submit: function() {
            this.logoutDialogVisible = false
            this.addChatMsg({
                role: 'sys',
                content: '本次会话已结束'
            })
        },

        /**
         * 注销dialog_取消
         */
        logoutDialog_cancel: function() {
            this.logoutDialogVisible = false;
        },
        
        /**
         * 聊天记录滚动到底部
         */
        goEnd: function() {
            this.$refs.common_chat.goEnd();
        },

        /**
         * 显示评分dialog
         */
        showRateDialog: function() {
            this.rateDialogVisible = true;
            this.$nextTick(() => {
                this.$refs.im_rate.init();
            });
        },

        /**
         * 显示留言dialog
         */
        showLeaveDialog: function() {
            this.leaveDialogVisible = true;
            this.$nextTick(() => {
                this.$refs.im_leave.init();
            });
        }
    }
};
</script>

<style lang="less">
@import '../../common/css/base.less';

.imClient-wrapper {
    #common-wrapper();
}

.imClient-inner {
    width: 850px;
    height: 100%;
    margin: 10px auto 0px;
    overflow: hidden;
    box-shadow: 0 1px 5px 2px #ccc;
    .imClient-header {
        position: relative;
        height: 35px;
        box-sizing: border-box;
        background: #1072b5;
        font-size: 13px;
        color: #ffffff;
        .name-wrapper {
            margin-left: 20px;
        }
        .logo {
            height: 45px;
            width: auto;
        }
        .opr-wrapper {
            right: 20px;
            font-size: 16px;
            cursor: pointer;
            .fa {
                margin-left: 10px;
            }
        }
    }
    .imClient-main {
        max-width: 100%;
        height: 520px;
        position: relative;
        & > .item {
            float: left;
            height: 100%;
            border-top-width: 0px;
            border-right-width: 0px;
            box-sizing: border-box;
            &:last-child {
                border-right-width: 1px;
            }
        }
        & > .imClientChat-wrapper {
            width: 550px;
            border-right: 1px solid #ccc;
        }
        & > .imClientInfo-wrapper {
            width: 300px;
        }
    }
}

// 信息区域
.imClientInfo-wrapper {
    width: 100%;
    height: 100%;
    background: #ffffff;
    .imClientInfo-notice-wrapper,
    .imClientInfo-faq-wrapper {
        .imClientInfo-item-header {
            font-weight: bolder;
            font-size: 16px;
            color: #1072b5;
            padding: 10px 15px 0;
        }
    }
    .imClientInfo-notice-wrapper {
        .imClientInfo-notice-main {
            padding: 0 15px;
            & > .link {
                margin: 10px 0;
                font-size: 12px;
                color: #000000;
            }
        }
    }
    .imClientInfo-faq-wrapper {
        height: 380px;
        border-top: 1px solid #ccc;
        .imClientInfo-faq-main {
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
            .el-collapse {
                border: 0px;
                .el-collapse-item__header {
                    position: relative;
                    padding: 0px 15px;
                    font-size: 12px;
                    background: transparent;
                    color: #000000;
                    &.is-active {
                        color: #f7455d;
                    }
                    .el-collapse-item__arrow {
                        position: absolute;
                        left: 267px;
                    }
                }
                .el-collapse-item__wrap {
                    background: transparent;
                    .el-collapse-item__content {
                        font-size: 12px;
                        color: #959699;
                        padding: 0px 15px 10px;
                    }
                }
            }
        }
    }
}

// element-UI
.el-dialog {
    width: 500px;
    background: #ffffff;
    color: #000000;
}
</style>
