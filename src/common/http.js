import axios from 'axios'
import { Notification } from 'element-ui'

const service = axios.create({
  baseURL: process.env.BASE_API,
  timeout: 1000*60,
  withCredentials: true
})

service.interceptors.request.use(
  config => {
    return config
  },
  error => {
    console.log(error)
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  response => {
    const code = response.status
    if (code < 200 || code > 300) {
      Notification.error({
        title: response.message
      })
    } else {
      return response.data
    }
  },
  error => {
    let code = 0
    try {
      code = error.response.data.status
    } catch (e) {
      if (error.toString().indexOf('Error: timeout') !== -1) {
        Notification.error({
          title: '网络请求超时',
          duration: 2500
        })
        return Promise.reject(error)
      }
      if (error.toString().indexOf('Error: Network Error') !== -1) {
        Notification.error({
          title: '网络请求错误',
          duration: 2500
        })
        return Promise.reject(error)
      }
    }
    if (code === 400) {
      const errorMsg = error.response.data.msg
      if (errorMsg) {
        Notification.error({
          title: errorMsg,
          duration: 2500
        })
      } else {
        Notification.error({
          title: '服务器忙不过来了',
          duration: 2500
        })
      }
    } else {
      const errorMsg = error.response.data.message
      if (errorMsg) {
        Notification.error({
          title: errorMsg,
          duration: 2500
        })
      }
    }
    return Promise.reject(error)
  }
)

export default service