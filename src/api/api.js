import request from '@/common/http.js'

export function send(data) {
  return request({
    url: '/chat/client',
    method: 'POST',
    data: data
  })
}