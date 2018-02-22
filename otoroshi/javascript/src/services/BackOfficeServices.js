import moment from 'moment';

let lastTokens = [];

export function uberFetch(url, config) {
  if (lastTokens.length === 0) {
    lastTokens.push(window.__firstToken);
  }
  const newConfig = { ...config, headers: { ...config.headers, 'otoroshi-xsrf-token': lastTokens.pop() }}
  console.log(newConfig.headers['otoroshi-xsrf-token']);
  return fetch(url, newConfig).then(response => {
    const tokenBack = response.headers.get('otoroshi-xsrf-token');
    if (tokenBack) {
      lastTokens.push(tokenBack);
    }
    return response;
  });
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Should stay in BackOffice controller
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function syncWithMaster(config) {
  return uberFetch(`/bo/api/redis/sync`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  }).then(r => r.json());
}

export function resetDB() {
  return uberFetch(`/bo/api/resetdb`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function fetchLine(lineId) {
  throw new Error('Deprecated API. Should not be used anymore !');
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// should use api proxy
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function env() {
  return uberFetch('/bo/api/env', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function version() {
  return uberFetch('/bo/api/version', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function fetchCanaryCampaign(serviceId) {
  return uberFetch(`/bo/api/proxy/api/services/${serviceId}/canary`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function resetCanaryCampaign(serviceId) {
  return uberFetch(`/bo/api/proxy/api/services/${serviceId}/canary`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function allServices(env, group) {
  const url = env
    ? `/bo/api/proxy/api/services?env=${env}`
    : group ? `/bo/api/proxy/api/services?group=${group}` : `/bo/api/proxy/api/services`;
  return uberFetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function fetchRemainingQuotas(serviceId, clientId) {
  return uberFetch(`/bo/api/proxy/api/services/${serviceId}/apikeys/${clientId}/quotas`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function fetchServiceEvents(serviceId, from, to) {
  return uberFetch(
    `/bo/api/proxy/api/services/${serviceId}/events?from=${from.valueOf()}&to=${to.valueOf()}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    }
  ).then(r => r.json());
}

export function fetchServiceStats(serviceId, from, to) {
  return uberFetch(
    `/bo/api/proxy/api/services/${serviceId}/stats?from=${from.valueOf()}&to=${to.valueOf()}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    }
  ).then(
    r => {
      if (r.status === 200) {
        return r.json();
      }
      console.log('error while fetching global stats');
      return {};
    },
    e => {
      console.log('error while fetching global stats');
      return {};
    }
  );
}

export function fetchGlobalStats(from, to) {
  return uberFetch(`/bo/api/proxy/api/stats/global?from=${from.valueOf()}&to=${to.valueOf()}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(
    r => {
      if (r.status === 200) {
        return r.json();
      }
      console.log('error while fetching global stats');
      return {};
    },
    e => {
      console.log('error while fetching global stats');
      return {};
    }
  );
}

export function fetchHealthCheckEvents(serviceId) {
  return uberFetch(`/bo/api/proxy/api/services/${serviceId}/health`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function fetchLines() {
  return uberFetch('/bo/api/proxy/api/lines', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })
    .then(
      r => r.json(),
      e => {
        console.log(e);
        return ['prod'];
      }
    )
    .then(
      r => r,
      e => {
        console.log(e);
        return ['prod'];
      }
    );
}

export function fetchApiKeys(lineId, serviceId) {
  return uberFetch(`/bo/api/proxy/api/services/${serviceId}/apikeys`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function deleteApiKey(serviceId, ak) {
  return uberFetch(`/bo/api/proxy/api/services/${serviceId}/apikeys/${ak.clientId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function createApiKey(serviceId, ak) {
  return uberFetch(`/bo/api/proxy/api/services/${serviceId}/apikeys`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ak),
  }).then(r => r.json());
}

export function updateApiKey(serviceId, ak) {
  return uberFetch(`/bo/api/proxy/api/services/${serviceId}/apikeys/${ak.clientId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ak),
  }).then(r => r.json());
}

export function getGlobalConfig() {
  return uberFetch(`/bo/api/proxy/api/globalconfig`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function updateGlobalConfig(gc) {
  return uberFetch(`/bo/api/proxy/api/globalconfig`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gc),
  }).then(r => r.json());
}

export function fetchService(lineId, serviceId) {
  return uberFetch(`/bo/api/proxy/api/services/${serviceId}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function findServicesForGroup(group) {
  return uberFetch(`/bo/api/proxy/api/groups/${group.id}/services`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function findAllGroups() {
  return uberFetch('/bo/api/proxy/api/groups', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function findGroupById(id) {
  return uberFetch(`/bo/api/proxy/api/groups/${id}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function deleteGroup(ak) {
  return uberFetch(`/bo/api/proxy/api/groups/${ak.id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function createGroup(ak) {
  return uberFetch(`/bo/api/proxy/api/groups`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ak),
  }).then(r => r.json());
}

export function updateGroup(ak) {
  return uberFetch(`/bo/api/proxy/api/groups/${ak.id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ak),
  }).then(r => r.json());
}

export function deleteService(service) {
  return uberFetch(`/bo/api/proxy/api/services/${service.id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function createNewService() {
  return uberFetch(`/bo/api/proxy/api/new/service`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function saveService(service) {
  return uberFetch(`/bo/api/proxy/api/services`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(service),
  }).then(r => r.json());
}

export function updateService(serviceId, service) {
  return uberFetch(`/bo/api/proxy/api/services/${serviceId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(service),
  }).then(r => r.json());
}

export function findAllApps() {
  return uberFetch(`/bo/api/apps`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function discardAllSessions() {
  return uberFetch(`/bo/api/sessions`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function discardSession(id) {
  return uberFetch(`/bo/api/sessions/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function fetchSessions() {
  return uberFetch(`/bo/api/sessions`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function discardAllPrivateAppsSessions() {
  return uberFetch(`/bo/api/papps/sessions`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function discardPrivateAppsSession(id) {
  return uberFetch(`/bo/api/papps/sessions/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function fetchPrivateAppsSessions() {
  return uberFetch(`/bo/api/papps/sessions`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function panicMode() {
  return uberFetch(`/bo/api/panic`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
    body: '{}',
  }).then(r => r.json());
}

export function fetchAdmins() {
  return uberFetch(`/bo/u2f/admins`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })
    .then(r => r.json())
    .then(_u2fAdmins => {
      return uberFetch(`/bo/simple/admins`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      })
        .then(r => r.json())
        .then(_admins => {
          const admins = _admins.map(admin => ({ ...admin, type: 'SIMPLE' }));
          const u2fAdmins = _u2fAdmins.map(admin => ({ ...admin, type: 'U2F' }));
          return [...u2fAdmins, ...admins];
        });
    });
}

export function discardAdmin(username, id) {
  if (!id) {
    return uberFetch(`/bo/simple/admins/${username}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    }).then(r => r.json());
  } else {
    return uberFetch(`/bo/u2f/admins/${username}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    }).then(r => r.json());
  }
}

export function fetchOtoroshi() {
  return uberFetch(`/bo/api/proxy/api/otoroshi.json`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function fetchAuditEvents() {
  return uberFetch(`/bo/api/events/audit`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function fetchAlertEvents() {
  return uberFetch(`/bo/api/events/alert`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function fetchLoggers() {
  return uberFetch(`/bo/api/loggers`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function changeLogLevel(name, level) {
  return uberFetch(`/bo/api/loggers/${name}/level?newLevel=${level}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
    body: '{}',
  }).then(r => r.json());
}

export function fetchTop10() {
  return uberFetch(`/bo/api/services/top10`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function fetchServicesMap() {
  return uberFetch(`/bo/api/services/map`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function fetchServicesTree() {
  return new Promise(s =>
    s({
      nodes: [
        { id: 'Otoroshi', group: '1' },
        { id: 'Group 1', group: '2' },
        { id: 'Group 2', group: '3' },
        { id: 'Service 11', group: '2' },
        { id: 'Service 21', group: '2' },
        { id: 'Service 12', group: '3' },
        { id: 'Service 22', group: '3' },
      ],
      links: [
        { source: 'Otoroshi', target: 'Group 1', value: 3 },
        { source: 'Otoroshi', target: 'Group 2', value: 3 },

        { source: 'Group 1', target: 'Service 11', value: 1 },
        { source: 'Group 1', target: 'Service 21', value: 1 },

        { source: 'Group 2', target: 'Service 12', value: 1 },
        { source: 'Group 2', target: 'Service 22', value: 1 },
      ],
    })
  );
  return uberFetch(`/bo/api/services/tree`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function findTemplateById(id) {
  return uberFetch(`/bo/api/proxy/api/services/${id}/template`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => (r.status === 404 ? null : r.json()));
}

export function deleteTemplate(ak) {
  return uberFetch(`/bo/api/proxy/api/services/${ak.serviceId}/template`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  }).then(r => r.json());
}

export function createTemplate(ak) {
  return uberFetch(`/bo/api/proxy/api/services/${ak.serviceId}/template`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ak),
  }).then(r => r.json());
}

export function updateTemplate(ak) {
  return uberFetch(`/bo/api/proxy/api/services/${ak.serviceId}/template`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ak),
  }).then(r => r.json());
}
