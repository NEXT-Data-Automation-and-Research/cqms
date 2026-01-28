/**
 * Route Configuration
 * Centralized route definitions for the application
 */

import type { RouteConfig } from './route-types.js'

/**
 * All application routes with metadata
 */
export const routes: RouteConfig[] = [
  {
    path: '/src/features/home/presentation/home-page.html',
    slug: 'home',
    meta: {
      label: 'Home',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
      roles: ['all'],
      sidebar: true,
      order: 1
    }
  },
  {
    path: '/src/features/dashboard/presentation/new-auditors-dashboard.html',
    slug: 'dashboard',
    meta: {
      label: "Auditors' Dashboard",
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>',
      roles: ['Quality Analyst', 'Quality Supervisor', 'Admin', 'Manager', 'Super Admin'],
      sidebar: true,
      order: 2
    }
  },
  {
    path: '/src/features/audit-distribution/presentation/new-audit-distribution.html',
    slug: 'audit-distribution',
    meta: {
      label: 'Audit Distribution',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>',
      roles: ['Quality Analyst', 'Quality Supervisor', 'Admin', 'Manager', 'Super Admin'],
      sidebar: true,
      order: 3
    }
  },
  {
    path: '/src/features/create-audit/presentation/new-create-audit.html',
    slug: 'create-audit',
    meta: {
      label: 'Create Audit',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>',
      roles: ['Quality Analyst', 'Quality Supervisor', 'Admin', 'Manager', 'Super Admin'],
      sidebar: true,
      order: 4
    }
  },
  {
    path: '/src/features/audit-reports/presentation/audit-reports.html',
    slug: 'audit-reports',
    meta: {
      label: 'Audit Reports',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
      roles: ['all'],
      sidebar: true,
      notificationBadgeId: 'acknowledgmentNotificationBadge',
      order: 5
    }
  },
  {
    path: '/src/features/ai-audit-reports/presentation/ai-audit-reports.html',
    slug: 'ai-audit-reports',
    meta: {
      label: 'AI Audit Reports',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>',
      roles: ['Quality Analyst', 'Quality Supervisor', 'Admin', 'Manager', 'Super Admin'],
      sidebar: true,
      order: 5.5
    }
  },
  {
    path: '/src/features/performance/presentation/performance.html',
    slug: 'performance',
    meta: {
      label: 'Performance',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>',
      roles: ['Quality Analyst', 'Quality Supervisor', 'Admin', 'Manager', 'Super Admin'],
      sidebar: true,
      badge: 'Upcoming',
      order: 6
    }
  },
  {
    path: '/src/features/coaching-remediation/presentation/coaching-remediation.html',
    slug: 'coaching-remediation',
    meta: {
      label: 'Coaching & Remediation',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>',
      roles: ['Quality Analyst', 'Quality Supervisor', 'Admin', 'Manager', 'Super Admin'],
      sidebar: true,
      badge: 'Upcoming',
      order: 7
    }
  },
  {
    path: '/src/features/reversal/presentation/reversal.html',
    slug: 'reversal',
    meta: {
      label: 'Reversal',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>',
      roles: ['all'],
      sidebar: true,
      notificationBadgeId: 'reversalNotificationBadge',
      additionalNotificationBadgeId: 'employeeReversalNotificationBadge',
      order: 8
    }
  },
  {
    path: '/src/features/event-management/presentation/event-management.html',
    slug: 'event-management',
    meta: {
      label: 'Event Management',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
      roles: ['all'],
      sidebar: true,
      badge: 'New',
      order: 9
    }
  },
  {
    path: '/settings',
    slug: 'settings',
    meta: {
      label: 'Settings',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
      roles: ['all'],
      sidebar: true,
      order: 11
    },
    submenu: [
      {
        path: '/src/features/settings/scorecards/presentation/scorecards.html',
        label: 'Scorecards',
        roles: ['all'],
        slug: 'scorecards'
      },
      {
        path: '/src/features/settings/user-management/presentation/user-management.html',
        label: 'User Management',
        roles: ['Admin', 'Manager', 'Super Admin'],
        slug: 'user-management'
      },
      {
        path: '/src/features/settings/permissions/presentation/permission-management.html',
        label: 'Permission Management',
        roles: ['Admin', 'Super Admin'],
        slug: 'permissions'
      },
      {
        path: '/src/features/settings/access-control/presentation/access-control.html',
        label: 'Access Control',
        roles: ['Admin'],
        slug: 'access-control'
      },
      {
        path: '/src/features/settings/impersonation/presentation/impersonation.html',
        label: 'User Impersonation',
        roles: ['Super Admin'],
        slug: 'impersonation'
      },
      {
        path: '/profile.html',
        label: 'Profile',
        roles: ['all'],
        slug: 'profile'
      }
    ]
  },
  {
    path: '/src/features/help/help/presentation/help.html',
    slug: 'help',
    meta: {
      label: 'Help',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
      roles: ['all'],
      sidebar: true,
      order: 12
    }
  },
  {
    path: '/src/features/notifications/presentation/notification-test.html',
    slug: 'notification-test',
    meta: {
      label: 'Notification Test',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>',
      roles: ['Admin', 'Super Admin', 'Quality Analyst', 'Quality Supervisor'],
      sidebar: false,
      order: 13
    }
  },
  {
    path: '/sandbox',
    slug: 'sandbox',
    meta: {
      label: 'Sandbox',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>',
      roles: ['all'],
      sidebar: false,
      order: 13
    },
    submenu: [
      {
        path: '/src/features/audit-form/presentation/new-audit-form.html',
        label: 'Audit Form',
        roles: ['all'],
        slug: 'audit-form'
      }
    ]
  }
]

/**
 * Special routes (not in sidebar)
 */
export const specialRoutes = {
  search: {
    path: '#search',
    meta: {
      label: 'Search',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>',
      roles: ['all'],
      sidebar: true,
      order: 0
    }
  }
}

