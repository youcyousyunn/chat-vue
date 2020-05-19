<!-- 服务端入口 -->
<template>
    <div class="imServer-wrapper">
        <main class="imServer-main">
            <im-record class="item im-record"></im-record>
            <im-chat v-if="selectedChat !== null" ref="im_chat" class="item im-chat"></im-chat>
        </main>
    </div>
</template>

<script >
import imRecord from './record.vue';
import imChat from './chat.vue';

export default {
    components: {
        imRecord: imRecord,
        imChat: imChat
    },
    data() {
        return {
            socket: null
        };
    },
    computed: {
        selectedChat() {
            return this.$store.getters.selectedChat
        }
    },
    watch: {},
    mounted() {
        this.regSocket()
    },
    methods: {
        regSocket() {
            this.socket = new WebSocket("ws://192.168.199.233:8088/community/socket/" + 9527);
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
            console.log("收到服务端消息:"+e.data)
            const data = JSON.parse(e.data)
            if(data.status === 'OPEN') { // 客户端上线通知
                this.$store.dispatch('chat/CLIENT_ON', JSON.parse(e.data))
            } else {

            }
		},              
		websocketclose: function (e) {
			console.log("connection closed ")
        }
    },
    destroyed() {
        this.$store.dispatch('chat/SERVER_OFF');
    }
};
</script>

<style lang="less">
@import '../../common/css/base.less';

.imServer-wrapper {
    #common-wrapper();
}

.imServer-wrapper {
    width: 100%;
    height: 100%;
    position: absolute;
    overflow: hidden;
    .imServer-main {
        height: 100%;
        max-width: 100%;
        position: relative;
        & > .item {
            float: left;
            border-right: 1px solid #e6e6e6;
            height: 100%;
        }
        & > .im-record {
            width: 280px;
        }
        & > .im-chat {
            width: calc(~'99% - 280px');
        }
    }
}
</style>
