<!-- 聊天记录 -->
<template>
    <div class="imChat-wrapper">
        <!-- 头部 -->
        <header class="imChat-header">
            <span class="name">{{selectedChat.clientChatName}}</span>
            <span class="time">{{getAccessTimeStr(selectedChat.accessTime)}}</span>
            <span v-show="selectedChat.state=='on' " class="on-line">在线</span>
            <span v-show="selectedChat.state=='off' " class="off-line ">离线</span>
        </header>
        <main class="imChat-main">
            <!-- 聊天框区域 -->
            <common-chat ref="common_chat" :chatInfoEn="selectedChat" :oprRoleName="'server'" @sendMsg="sendMsg"></common-chat>
        </main>
    </div>
</template>

<script>
import commonChat from '@/components/common/common_chat.vue';

export default {
    components: {
        commonChat: commonChat
    },
    data() {
        return {}
    },
    computed: {
        selectedChat() {
            return this.$store.getters.selectedChat
        },
        storeHaveNewMsgDelegate() {
            return this.$store.getters.haveNewMsgDelegate
        },
        serverChat() {
            return this.$store.getters.serverChat
        }
    },
    watch: {
        selectedChat(value) {
            this.$refs.common_chat.goEnd();
        },
        storeHaveNewMsgDelegate(value) {
            this.$refs.common_chat.goEnd();
        }
    },
    methods: {
        /**
         * 发送消息
         */
        sendMsg: function(rs) {
            const msg = {
                clientId: this.selectedChat.clientChatId,
                role: 'SERVER',
                serviceAvatarUrl: this.serverChat.avatarUrl,
                content: rs.msg.content,
                contentType: rs.msg.contentType
            }
            // 1.socket发送消息
            this.$store.dispatch('chat/serverSendMsg', {msg})

            // 2.添加此消息到该chat对象的消息集合里
            this.$store.dispatch('chat/addChatMsg', {
                clientChatId: this.selectedChat.clientChatId,
                msg: msg,
                successCallback: function() {
                    rs.successCallbcak && rs.successCallbcak()
                }
            })
        },
        goEnd: function() {
            this.$refs.common_chat.goEnd()
        },

        /**
         * 获取chat的访问时间
         */
        getAccessTimeStr: function(accessTime) {
            return this.$ak.Utils.getDateTimeStr(accessTime, 'Y-m-d H:i:s')
        }
    }
}
</script>
<style lang="less">
.imChat-wrapper {
    .imChat-header {
        display: flex;
        align-items: center;
        width: 100%;
        height: 50px;
        padding-left: 10px;
        border-bottom: 1px solid #e6e6e6;
        font-size: 16px;
        span {
            margin-right: 20px;
        }
        .on-line {
            color: #70ed3a;
        }
        .off-line {
            color: #bbbbbb;
        }
    }
    .imChat-main {
        height: calc(~'100% - 50px');
    }
}
</style>

