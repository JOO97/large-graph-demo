import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: '/force',
    name: 'Force',
    component: () => import('@/views/force')
  }
  // {
  //   path: '/combo-force',
  //   name: 'comboForce',
  //   component: () => import('@/views/combo-force')
  // }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
