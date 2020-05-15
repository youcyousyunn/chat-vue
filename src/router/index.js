import Vue from 'vue'
import Router from 'vue-router'
import server from '@/components/imServer/imServer'
import client from '@/components/imClient/imClient'

Vue.use(Router)

export const constantRoutes = [
    {
        path: '/',
        redirect: 'server'
    },
    {
        path: '/imserver',
        name: 'server',
        component: server
    },
    {
        path: '/imclient',
        name: 'client',
        component: client
    },
    {
        path: '/server',
        name: 'server',
        component: () => import('@/views/server')
    },
    {
        path: '/client',
        name: 'client',
        component: () => import('@/views/client')
    }
]

export default new Router({
    mode: 'history', // 需要服务端支持
    base: '/chat/',
    scrollBehavior: () => ({ y: 0 }),
    routes: constantRoutes
})