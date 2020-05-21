import Vue from 'vue'
import Router from 'vue-router'
Vue.use(Router)

export const constantRoutes = [
    {
        path: '/',
        redirect: 'server'
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