const SECONDS_IN_A_DAY = 86400;
const SECONDS_IN_AN_HOUR = 3600;
const SECONDS_IN_A_MINUTE = 60;
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

let accessToken = undefined;

export const getAccessToken = () => {
  return accessToken;
}

function setAccessToken(value) {
  accessToken = value;
  return accessToken;
}

function checkTokenValidity(token) {
  if (!token) return false;
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); 
  var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return (jsonPayload.exp * 1000 > Date.now());
}

export const refreshTokenApi =  async () => {
  if (checkTokenValidity(getAccessToken())) return getAccessToken();

  const serverResponse = await fetch(`${window.origin}/api/tokens/token_refresh`, {method: 'GET', 
                                                                            headers: new Headers({
                                                                              'content-type': 'application/json'
                                                                            })});
  let refreshTokenApiObj = await serverResponse.json();
  setAccessToken(refreshTokenApiObj.accessToken);

  return getAccessToken();
}

export const uidTokenApi = async () => {
  const serverResponse = await fetch(`${window.origin}/api/tokens/token_uid`, {method: 'POST'});
  let uidTokenApiObj = await serverResponse.json();
  return uidTokenApiObj;
}

window.onload = function() {
  let theme = localStorage.getItem('data-theme');
  if (theme == 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    document.querySelectorAll('.smartphone').forEach(element => {
      if(element.classList.contains('dark')) element.classList.add('hide');
    })
    navThemeBtn.checked = false;
    return;
  }
  else {
    document.documentElement.setAttribute('data-theme' , 'dark');
    document.querySelectorAll('.smartphone').forEach(element => {
      if(element.classList.contains('light')) element.classList.add('hide');
    })
    navThemeBtn.checked = true;
    return;
  }
}

function showThumbnail(n) {
  let slides = document.querySelectorAll(".thumbnail");
  let dots = document.querySelectorAll(".dot");
  slideIndex = n;
  n > slides.length ? slideIndex = 1 : null; 
  n < 1 ? slideIndex = slides.length : null;
  for (let i = 0; i < slides.length; i++) {
    slides[i].classList.contains("current") ? slides[i].classList.remove("current") : null;
    dots[i].classList.contains("current") ? dots[i].classList.remove("current") : null;
  }
  slides[slideIndex - 1].classList.add("current");
  dots[slideIndex - 1].classList.add("current");
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////


const body = document.querySelector("body");
const navItems = document.querySelector(".navbar");
const navMenuBtn = document.querySelector(".navbar-menu");
if (navMenuBtn) {
  navMenuBtn.onclick = () => {
    body.classList.add("fixed");
    navItems.classList.add("show");
  }
}


const navCancelBtn = document.querySelector(".navbar-cancel");
if (navCancelBtn) {
  navCancelBtn.onclick = () => {
    body.classList.remove("fixed");
    navItems.classList.remove("show");
  }
}


const navThemeBtn = document.querySelector("#theme-toggle");
if (navThemeBtn) {
  navThemeBtn.onclick = () => {
    if (navThemeBtn.checked) {
      document.documentElement.setAttribute('data-theme', 'dark');    
      document.querySelectorAll('.smartphone').forEach(element => {
        if(element.classList.contains('light')) element.classList.add('hide');
        if(element.classList.contains('dark')) element.classList.remove('hide');
      })
      localStorage.setItem('data-theme', 'dark');
    }
    else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.querySelectorAll('.smartphone').forEach(element => {
        if(element.classList.contains('dark')) element.classList.add('hide');
        if(element.classList.contains('light')) element.classList.remove('hide');
      })
      localStorage.setItem('data-theme', 'light');
    }
  }
}


const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('show');
    //else entry.target.classList.remove('show');
  })
});
const animatedElements = document.querySelectorAll('.animate.hide');
animatedElements.forEach((el) => observer.observe(el));
const animatedCircles = document.querySelectorAll('.circle');
animatedCircles.forEach((el) => observer.observe(el));
const animatedImage = document.querySelectorAll('.step-img');
animatedImage.forEach((el) => observer.observe(el));


const smartphone = document.querySelectorAll(".smartphone");
if (smartphone) {
  document.querySelectorAll(".smartphone").forEach((el) => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.smartphone').forEach((smartphone) => {
        smartphone.classList.add('behind');
        smartphone.classList.remove('above');
      })
      el.classList.remove('behind');
      el.classList.add('above');
    })
  });
}


const searchThumbnails = document.querySelector("#ssearch-thumbnails");
if (searchThumbnails) {
  let slideIndex = 1;
  const leftArrowTopStrategies = document.querySelector("#ssearch-thumbnails").querySelector(".fa-chevron-left");
  const rightArrowTopStrategies = document.querySelector("#ssearch-thumbnails").querySelector(".fa-chevron-right");

  if (leftArrowTopStrategies) {
    leftArrowTopStrategies.onclick = () => {
      showThumbnail(slideIndex - 1);
    }
    rightArrowTopStrategies.onclick = () => {
      showThumbnail(slideIndex + 1);
    }
  }
}


const searchInput = document.querySelector("#search-input");
const searchForm = document.querySelector("#search-form");
if (searchForm) {
  searchForm.onsubmit = async (e) => {
    e.preventDefault();
    let newUrl = window.location.origin + window.location.pathname + "?strategy=" + searchInput.value;
    window.location.href = newUrl;
  }
}


const scalpingBtn = document.querySelector("#scalping");
const intradayBtn = document.querySelector("#intraday");
const swingBtn = document.querySelector("#swing");
if (scalpingBtn) {
  scalpingBtn.onclick = () => {
    hideStrategy('scalping');
    scalpingBtn.classList.toggle("selected");
  };
  intradayBtn.onclick = () => {
    hideStrategy('intraday');
    intradayBtn.classList.toggle("selected");
  };
  swingBtn.onclick = () => {
    hideStrategy('swing');
    swingBtn.classList.toggle("selected");
  };
}

const apiMessage = document.querySelector('#user-api-message');
const userSubscriptionContainer = document.querySelector("#user-subscription-container");
if (userSubscriptionContainer) {
  const status = [...document.querySelectorAll(".status.positive"), ...document.querySelectorAll(".status.alert")];
  status.forEach((el) => {
    el.addEventListener('click', () => {
      const italic = el.querySelector('i');
      el.classList.toggle('positive');
      el.classList.toggle('alert');
      italic.classList.toggle('positive');
      italic.classList.toggle('alert');
      if (el.classList.contains('positive')) {
        el.dataset.value = true;
        el.innerHTML = '<i class="fa-solid fa-circle positive"></i> <span>Active</span>';
      }
      else {
        el.dataset.value = false;
        el.innerHTML = '<i class="fa-solid fa-circle alert"></i> <span>Stop</span>';
      }
    });
  });
  const quotes = document.querySelectorAll(".quote");
  quotes.forEach((el) => {
    el.addEventListener('click', () => {
      const currentSubscription = el.parentNode.parentNode.parentNode;
      const image = currentSubscription.querySelector('img');
      image.src = el.querySelector('img').src;
      image.dataset.value = el.querySelector('img').dataset.value;
      currentSubscription.classList.remove('show');
    });
  });
  const apis = document.querySelectorAll(".api");
  apis.forEach((el) => {
    el.addEventListener('click', () => {
      const currentApi = el.parentNode.parentNode.parentNode;
      currentApi.dataset.value = el.dataset.value;
      currentApi.querySelector('button').innerText = el.dataset.value;
      currentApi.classList.remove('show');
    });
  });
  const userCurrent = userSubscriptionContainer.querySelectorAll(".dropdown");
  userCurrent.forEach((el) => {
    const modal = el.querySelector('.info.modal');
    el.addEventListener('click', () => {
      modal.classList.contains('show') ? modal.classList.remove('show') : modal.classList.add('show');
    });
  });

  const strategiesSubscription = userSubscriptionContainer.querySelectorAll(".subscription");
  const confirmBtn = userSubscriptionContainer.querySelector('#subscription-confirm');
  confirmBtn.addEventListener('click', async() => {
    let subscriptions = new Array();
    strategiesSubscription.forEach((el) => {
      const row = el.querySelectorAll('td');
      subscriptions.push({strategy: row[0].textContent,
                          status: row[3].querySelector('button').dataset.value ? row[3].querySelector('button').dataset.value : null,
                          capital: row[4].querySelector('input').value ? row[4].querySelector('input').value : null,
                          leverage: row[5].querySelector('input').value ? row[5].querySelector('input').value : null,
                          quote: row[7].querySelector('img').dataset.value ? row[7].querySelector('img').dataset.value : null,
                          api: row[8].dataset.value ? row[8].dataset.value : null,});
    });
    const token = await refreshTokenApi();
    if (!token) return;
    const serverResponse = await fetch(`${window.origin}/api/users/${document.querySelector('main').dataset.user}/subscriptions`, {
      method: 'PATCH',
      credentials: 'include',
      body: JSON.stringify(subscriptions),
      cache: 'no-cache',
      headers: new Headers({
        'authorization': `bearer ${token}`,
        'content-type': 'application/json'
      })
    });
    if (serverResponse.ok) {
      const jsonResponse = await serverResponse.json();
      if (jsonResponse.message){
        apiMessage.innerHTML = '';
        jsonResponse.message.forEach(msg => {
          apiMessage.innerHTML += `<span class="vitem iberu-button medium rounded ${jsonResponse.result ? '' : 'warning'}">
                                    ${jsonResponse.result ? '' : '<i class="negative fa-solid fa-triangle-exclamation"></i>'}${msg}
                                   </span>`;
        });
        apiMessage.classList.remove('hide');
        setTimeout(() => {
          apiMessage.classList.add('hide');
        }, 4000);
      }
    }
  })
}


const userBacktestContainer = document.querySelector('#user-backtest-container');
if (userBacktestContainer) {
  const pdfLinks = document.querySelectorAll('.backtest-pdf');

pdfLinks.forEach(link => {
  link.addEventListener('click', async event => {
    event.preventDefault();  // Prevent the default link behavior
    
    const token = await refreshTokenApi();
    if (!token) return;

    try {
      const response = await fetch(`/download?file=${encodeURIComponent(link.dataset.value)}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const filename = `${link.dataset.value}.pdf`;
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const downloadLink = document.createElement('a');
        downloadLink.style.display = 'none';
        downloadLink.href = url;
        downloadLink.download = filename;
        downloadLink.type = 'application/pdf';

        document.body.appendChild(downloadLink);
        downloadLink.click();

        URL.revokeObjectURL(url);
      } else {
        console.error('Download failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('An error occurred:', error);
    }
  });
});
}


const token = await refreshTokenApi();
const dropzone = document.querySelector('#dropzone-form');
if (dropzone) {
  Dropzone.autoDiscover = false;

  // Initialize Dropzone for the avatar upload
  var avatar = new Dropzone(dropzone, {
    thumbnail: null,
  });

  // Attach headers to requests
  avatar.on("sending", function(file, xhr, formData) {
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    // Add any other custom headers you need
  });

  avatar.on("success", function (file, response) {
    location.reload();
  });
}


const removePictureBtn = document.querySelector('#user-remove-picture');
if (removePictureBtn) {
  removePictureBtn.addEventListener('click', async() => {
    const serverResponse = await fetch(`${window.origin}/users/${document.querySelector('main').dataset.user}/avatar`, {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-cache',
      headers: new Headers({
        'authorization': `bearer ${token}`,
        'content-type': 'application/json'
      })
    });
    location.reload(true);
  })
}


async function removeApi(el) {
  const token = await refreshTokenApi();
  if (!token) return;
  const btn = el.parentNode;
  const serverResponse = await fetch(`${window.origin}/api/users/${document.querySelector('main').dataset.user}/apis`, {
    method: 'DELETE',
    credentials: 'include',
    body: JSON.stringify({api: btn.dataset.value}),
    cache: 'no-cache',
    headers: new Headers({
      'authorization': `bearer ${token}`,
      'content-type': 'application/json'
    })
  });
  const table = btn.parentNode.parentNode.parentNode;
  table.removeChild(btn.parentNode.parentNode);
  userSubscriptionContainer.querySelectorAll('.subscription').forEach((el) => {
    let apiOptions = el.querySelector('#subscription-api').querySelector('.vlist');
    apiOptions.querySelector(`#api-${btn.dataset.value}`).remove();
  });
  /*if (serverResponse.ok) {
    const jsonResponse = await serverResponse.json();
    apiMessage.innerHTML = '';
      jsonResponse.message.forEach(msg => {
        apiMessage.innerHTML += `<span class="vitem iberu-button medium rounded ${jsonResponse.result ? '' : 'warning'}">
                                  ${jsonResponse.result ? '' : '<i class="negative fa-solid fa-triangle-exclamation"></i>'}${msg}
                                 </span>`;
      });
      apiMessage.classList.remove('hide');
      setTimeout(() => {
        apiMessage.classList.add('hide');
      }, 4000);
  }*/
}


const userApiContainer = document.querySelector('#user-api-container');
if (userApiContainer) {

  function clickHandlerApi(event) {
    removeApi(event.target);
  }

  const table = userApiContainer.querySelector('.api-table');
  let removeApiBtn = userApiContainer.querySelectorAll('.fa-trash-can');
  removeApiBtn.forEach((el) => {
    el.addEventListener('click', clickHandlerApi);
  });

  const exchangeBtn = userApiContainer.querySelector('#user-api-exchange');
  exchangeBtn.addEventListener('click', () => {
    const modal = exchangeBtn.parentNode.querySelector('.info.modal');
    modal.classList.contains('show') ? modal.classList.remove('show') : modal.classList.add('show');
  });

  const exchange = document.querySelectorAll(".exchange");
  exchange.forEach((el) => {
    el.addEventListener('click', () => {
      const modal = exchangeBtn.parentNode.querySelector('.info.modal');
      let div = exchangeBtn.querySelector('.hlist');
      div.innerHTML = '';
      div.appendChild(el.querySelector('.hlist').cloneNode(true));
      modal.classList.remove('show');
    });
  });

  const createApiBtn = userApiContainer.querySelector('#create-api');
  createApiBtn.addEventListener('click', async() => {
    const token = await refreshTokenApi();
    if (!token) return;
    const apiName = userApiContainer.querySelector('#api-name').value;
    const apiKey = userApiContainer.querySelector('#api-key').value;
    const apiExchange = userApiContainer.querySelector('#user-api-exchange').querySelector('img').dataset.value;
    const serverResponse = await fetch(`${window.origin}/api/users/${document.querySelector('main').dataset.user}/apis`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({api: apiName,
                            exchange: apiExchange,
                            api_key: apiKey,
                            api_secret: userApiContainer.querySelector('#api-secret').value}),
      cache: 'no-cache',
      headers: new Headers({
        'authorization': `bearer ${token}`,
        'content-type': 'application/json'
      })
    });
    const row = table.insertRow();
    row.insertCell(0).innerText = apiName;
    row.insertCell(1).innerText = apiKey;
    row.insertCell(2).innerText = apiExchange;
    row.insertCell(3).innerHTML = `<button class="big negative delete-api" data-value="${apiName}">
                                    <i class="fa-regular fa-trash-can fa-lg"></i>
                                  </button>`;
    userSubscriptionContainer.querySelectorAll('.subscription').forEach((el) => {
      let apiOptions = el.querySelector('#subscription-api').querySelector('.vlist');
      apiOptions.innerHTML += `<button class="api vitem big" id="api-${apiName}" data-value="${apiName}">
                                 ${apiName}
                               </button>`;
      const apis = document.querySelectorAll(".api");
      apis.forEach((el) => {
        el.addEventListener('click', () => {
          const currentApi = el.parentNode.parentNode.parentNode;
          currentApi.dataset.value = el.dataset.value;
          currentApi.querySelector('button').innerText = el.dataset.value;
          currentApi.classList.remove('show');
        });
  });
    });

    removeApiBtn = userApiContainer.querySelectorAll('.fa-trash-can');
    removeApiBtn.forEach((el) => {
      el.removeEventListener("click", clickHandlerApi);
      el.addEventListener('click', clickHandlerApi);
    });
    
    userApiContainer.querySelector('#api-name').value = '';
    userApiContainer.querySelector('#api-key').value = '';
    userApiContainer.querySelector('#api-secret').value = '';
  });
}


const logOutBtn = document.querySelector('#logout');
if (logOutBtn) {
  logOutBtn.addEventListener('click', async() => {
    window.location.href = `${window.location.origin}/auth/logout`;
  })
}


const userOverviewContainer = document.querySelector('#user-overview-container');
const userOverviewButton = document.querySelector('#overview');
const userSubscriptionButton = document.querySelector('#subscription');
const userBacktestButton = document.querySelector('#backtest');
const userSettingsContainer = document.querySelector('#user-settings-container');
const userSettingsButton = document.querySelector('#settings');
const userApiButton = document.querySelector('#api');

if (userOverviewButton) {
  userOverviewButton.addEventListener('click', () => {
    userOverviewContainer.classList.remove('hide');
    userBacktestContainer.classList.add('hide');
    userSubscriptionContainer.classList.add('hide');
    userSettingsContainer.classList.add('hide');
    userApiContainer.classList.add('hide');
    userOverviewButton.classList.add('current');
    userBacktestButton.classList.remove('current');
    userSubscriptionButton.classList.remove('current');
    userSettingsButton.classList.remove('current');
    userApiButton.classList.remove('current');
  });
  userSubscriptionButton.addEventListener('click', () => {
    userSubscriptionContainer.classList.remove('hide');
    userBacktestContainer.classList.add('hide');
    userOverviewContainer.classList.add('hide');
    userSettingsContainer.classList.add('hide');
    userApiContainer.classList.add('hide');
    userSubscriptionButton.classList.add('current');
    userBacktestButton.classList.remove('current');
    userOverviewButton.classList.remove('current');
    userSettingsButton.classList.remove('current');
    userApiButton.classList.remove('current');
  });
  userBacktestButton.addEventListener('click', () => {
    userBacktestContainer.classList.remove('hide');
    userSubscriptionContainer.classList.add('hide');
    userOverviewContainer.classList.add('hide');
    userSettingsContainer.classList.add('hide');
    userApiContainer.classList.add('hide');
    userBacktestButton.classList.add('current');
    userSubscriptionButton.classList.remove('current');
    userOverviewButton.classList.remove('current');
    userSettingsButton.classList.remove('current');
    userApiButton.classList.remove('current');
  });
  userSettingsButton.addEventListener('click', () => {
    userSettingsContainer.classList.remove('hide');
    userBacktestContainer.classList.add('hide');
    userSubscriptionContainer.classList.add('hide');
    userOverviewContainer.classList.add('hide');
    userApiContainer.classList.add('hide');
    userSettingsButton.classList.add('current');
    userBacktestButton.classList.remove('current');
    userOverviewButton.classList.remove('current');
    userSubscriptionButton.classList.remove('current');
    userApiButton.classList.remove('current');
  });
  userApiButton.addEventListener('click', () => {
    userApiContainer.classList.remove('hide');
    userBacktestContainer.classList.add('hide');
    userSubscriptionContainer.classList.add('hide');
    userOverviewContainer.classList.add('hide');
    userSettingsContainer.classList.add('hide');
    userApiButton.classList.add('current');
    userBacktestButton.classList.remove('current');
    userOverviewButton.classList.remove('current');
    userSubscriptionButton.classList.remove('current');
    userSettingsButton.classList.remove('current');
  });
}