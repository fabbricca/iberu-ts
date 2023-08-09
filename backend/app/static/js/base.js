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

  const serverResponse = await fetch(`${window.origin}/api/token_refresh`, {method: 'POST'});
  let refreshTokenApiObj = await serverResponse.json();
  setAccessToken(refreshTokenApiObj.accessToken);

  return getAccessToken();
}

export const uidTokenApi = async () => {
  const serverResponse = await fetch(`${window.origin}/api/token_uid`, {method: 'POST'});
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

function pageQuery() {
  if(searchInput.value) {
    let tableRows = document.querySelector(".strategies-table").querySelector("tbody").querySelectorAll("tr");
    for(let i=0; i < tableRows.length; i++) {
      let txtValue = tableRows[i].querySelectorAll("td")[1].textContent || tableRows[i].querySelectorAll("td")[1].innerText;
      if (txtValue.toLowerCase().indexOf(searchInput.value.toLowerCase()) > -1) {
        query = true;
        tableRows[i].classList.remove("hide");
      }
      else tableRows[i].classList.add("hide");
    }
    return;
  }
  else {
    let tableRows = document.querySelector(".strategies-table").querySelector("tbody").querySelectorAll("tr");
    for(let i=0; i < tableRows.length; i++) {
      if(!tableRows[i].classList.contains("query"))
        tableRows[i].classList.remove("hide");
      else 
        tableRows[i].classList.remove("show");
    }
    return;
  }
}

function hideStrategy(type) {
  let tableRows = document.querySelector(".strategies-table").querySelector("tbody").querySelectorAll("tr");
    for(let i=0; i < tableRows.length; i++) {
      if (tableRows[i].classList.contains(type)) tableRows[i].classList.toggle("hide");
    }
    return;
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
    console.log(entry);
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
  searchInput.onkeyup = () => pageQuery();
  searchForm.onsubmit = async (e) => {
    e.preventDefault();
    const tableBody = document.querySelector(".strategies-table").querySelector("tbody");
    let strategyFound = [];
    tableBody.querySelectorAll("tr").forEach(row => {
      if (!row.classList.contains("hide")) strategyFound.push(row.querySelectorAll("td")[1].innerText)
    });
    const serverResponse = await fetch(`${window.origin}/api/strategy`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({strategy: searchInput.value,
                            found: strategyFound,}),
      cache: 'no-cache',
      headers: new Headers({
        'content-type': 'application/json'
      })
    });

    let response = await serverResponse.text();
    tableBody.innerHTML += response;
    return false;
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

const userSubscriptionContainer = document.querySelector("#user-subscription-container");
if (userSubscriptionContainer) {
  const status = document.querySelectorAll(".status");
  status.forEach((el) => {
    el.addEventListener('click', () => {
      const italic = el.querySelector('i');
      el.classList.toggle('positive');
      el.classList.toggle('alert');
      italic.classList.toggle('positive');
      italic.classList.toggle('alert');
      if (el.classList.contains('positive')) {
        el.dataset.value = true;
        el.innerHTML = '<i class="fa-solid fa-circle positive"></i> Active';
      }
      else {
        el.dataset.value = false;
        el.innerHTML = '<i class="fa-solid fa-circle alert"></i> Stop';
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
    const serverResponse = await fetch(`${window.origin}/api/user/subscription`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(subscriptions),
      cache: 'no-cache',
      headers: new Headers({
        'authorization': `bearer ${token}`,
        'content-type': 'application/json'
      })
    });
  })
}


const dropzone = document.querySelector('.dropzone');
if (dropzone){
  Dropzone.autoDiscover = false;
  var avatar = new Dropzone(".dropzone", {
    thumbnail: null,
    dictDefaultMessage: "Change picture",
  });
  
  avatar.on("success", function (file, response) {
      location.reload();
  });
}


const removePictureBtn = document.querySelector('#user-remove-picture');
if (removePictureBtn) {
  removePictureBtn.addEventListener('click', async() => {
    const serverResponse = await fetch(`${window.origin}/delete_avatar`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-cache',
      headers: new Headers({
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
  const serverResponse = await fetch(`${window.origin}/api/user/delete_api`, {
    method: 'POST',
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
      console.log(el.querySelector('.hlist'), div);
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
    const serverResponse = await fetch(`${window.origin}/api/user/create_api`, {
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
    row.insertCell(3).innerHTML = `<button class="negative" data-value="${apiName}">
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
///////////////////////SCRITTO MALE
const userOverviewPage = document.querySelector('#user-overview-container');
const userOverviewButton = document.querySelector('#overview');
const userSubscriptionPage = document.querySelector('#user-subscription-container');
const userSubscriptionButton = document.querySelector('#subscription');
const userSettingsPage = document.querySelector('#user-settings-container');
const userSettingsButton = document.querySelector('#settings');
const userApiPage = document.querySelector('#user-api-container');
const userApiButton = document.querySelector('#api');

if (userOverviewButton) {
  userOverviewButton.addEventListener('click', () => {
    userOverviewPage.classList.remove('hide');
    userSubscriptionPage.classList.add('hide');
    userSettingsPage.classList.add('hide');
    userApiPage.classList.add('hide');
    userOverviewButton.classList.add('current');
    userSubscriptionButton.classList.remove('current');
    userSettingsButton.classList.remove('current');
    userApiButton.classList.remove('current');
  });
  userSubscriptionButton.addEventListener('click', () => {
    userSubscriptionPage.classList.remove('hide');
    userOverviewPage.classList.add('hide');
    userSettingsPage.classList.add('hide');
    userApiPage.classList.add('hide');
    userSubscriptionButton.classList.add('current');
    userOverviewButton.classList.remove('current');
    userSettingsButton.classList.remove('current');
    userApiButton.classList.remove('current');
  });
  userSettingsButton.addEventListener('click', () => {
    userSettingsPage.classList.remove('hide');
    userSubscriptionPage.classList.add('hide');
    userOverviewPage.classList.add('hide');
    userApiPage.classList.add('hide');
    userSettingsButton.classList.add('current');
    userOverviewButton.classList.remove('current');
    userSubscriptionButton.classList.remove('current');
    userApiButton.classList.remove('current');
  });
  userApiButton.addEventListener('click', () => {
    userApiPage.classList.remove('hide');
    userSubscriptionPage.classList.add('hide');
    userOverviewPage.classList.add('hide');
    userSettingsPage.classList.add('hide');
    userApiButton.classList.add('current');
    userOverviewButton.classList.remove('current');
    userSubscriptionButton.classList.remove('current');
    userSettingsButton.classList.remove('current');
  });
}