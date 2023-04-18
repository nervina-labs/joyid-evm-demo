import { lazy } from 'solid-js'
import type { RouteDefinition } from '@solidjs/router'

import { Home } from './pages/home'
import AboutData from './pages/about.data'
import { Root } from './pages/root'
import { SendEth } from './pages/send'

export const routes: RouteDefinition[] = [
  {
    path: '/',
    component: Root,
  },
  {
    path: '/home',
    component: Home,
  },
  {
    path: '/send',
    component: SendEth,
  },
  {
    path: '/about',
    component: lazy(() => import('./pages/about')),
    data: AboutData,
  },
  {
    path: '**',
    component: lazy(() => import('./errors/404')),
  },
]
