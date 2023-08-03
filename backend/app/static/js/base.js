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
  const userCurrentQuotes = userSubscriptionContainer.querySelectorAll(".dropdown");
  userCurrentQuotes.forEach((el) => {
    const quotesContainer = el.querySelector('.info.modal');
    el.addEventListener('click', () => {
      quotesContainer.classList.contains('show') ? quotesContainer.classList.remove('show') : quotesContainer.classList.add('show');
    });
  });

  const confirmBtn = userSubscriptionContainer.querySelector('#subscription-confirm');
  confirmBtn.addEventListener('click', async() => {
    let subscriptions = new Array();
    userCurrentQuotes.forEach((el) => {
      const row = el.parentNode.querySelectorAll('td');
      subscriptions.push({strategy: row[0].textContent,
                          leverage: row[4].querySelector('input').value ? row[4].querySelector('input').value : null,
                          quote: row[6].querySelector('img').dataset.value ? row[6].querySelector('img').dataset.value : null,});
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


const removeBtn = document.querySelector('#user-remove-picture');
if (removeBtn) {
  removeBtn.addEventListener('click', async() => {
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
///////////////////////SCRITTO MALE
const userOverviewPage = document.querySelector('#user-overview-container') || undefined;
const userOverviewButton = document.querySelector('#overview') || undefined;
const userSubscriptionPage = document.querySelector('#user-subscription-container') || undefined;
const userSubscriptionButton = document.querySelector('#subscription') || undefined;
const userSettingsPage = document.querySelector('#user-settings-container') || undefined;
const userSettingsButton = document.querySelector('#settings') || undefined;

if (userOverviewButton) {
  userOverviewButton.addEventListener('click', () => {
    userOverviewPage.classList.remove('hide');
    userSubscriptionPage.classList.add('hide');
    userSettingsPage.classList.add('hide');
    userOverviewButton.classList.add('current');
    userSubscriptionButton.classList.remove('current');
    userSettingsButton.classList.remove('current');
  });
  userSubscriptionButton.addEventListener('click', () => {
    userSubscriptionPage.classList.remove('hide');
    userOverviewPage.classList.add('hide');
    userSettingsPage.classList.add('hide');
    userSubscriptionButton.classList.add('current');
    userOverviewButton.classList.remove('current');
    userSettingsButton.classList.remove('current');
  });
  userSettingsButton.addEventListener('click', () => {
    userSettingsPage.classList.remove('hide');
    userSubscriptionPage.classList.add('hide');
    userOverviewPage.classList.add('hide');
    userSettingsButton.classList.add('current');
    userOverviewButton.classList.remove('current');
    userSubscriptionButton.classList.remove('current');
  });
}