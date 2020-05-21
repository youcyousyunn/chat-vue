import request from '@/common/http.js'

export function serverSendMsg(data) {
  return request({
    url: '/chat/server',
    method: 'POST',
    data: data
  })
}

export function clientSendMsg(data) {
  return request({
    url: '/chat/client',
    method: 'POST',
    data: data
  })
}