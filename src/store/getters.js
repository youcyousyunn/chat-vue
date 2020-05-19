const getters = {
    selectedChat: state => state.chat.selectedChat,
    currentChatList: state => state.chat.currentChatList,
    haveNewMsgDelegate: state => state.chat.haveNewMsgDelegate,
    serverChat: state => state.chat.serverChat
  }
  
  export default getters