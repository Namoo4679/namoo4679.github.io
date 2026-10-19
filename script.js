"use strict";

// 프로젝트02: 별도 설치나 API 키 없이 실행되는 시작 홈페이지입니다.
const cities = [
  { id: "seoul", latitude: 37.5665, longitude: 126.978 },
  { id: "jeju", latitude: 33.4996, longitude: 126.5312 }
];
const quotes = [
  ["천 리 길도 한 걸음부터.", "한국 속담"],
  ["시작이 반이다.", "한국 속담"],
  ["구슬이 서 말이라도 꿰어야 보배.", "한국 속담"],
  ["티끌 모아 태산.", "한국 속담"],
  ["뜻이 있는 곳에 길이 있다.", "격언"]
];
let quoteIndex = Math.floor(Math.random() * quotes.length);

function showQuote() {
  document.getElementById("quote-text").textContent = quotes[quoteIndex][0];
  document.getElementById("quote-author").textContent = quotes[quoteIndex][1];
}
document.getElementById("next-quote").addEventListener("click", () => {
  quoteIndex = (quoteIndex + 1) % quotes.length;
  showQuote();
});
showQuote();

function updateDate() {
  const now = new Date();
  const today = document.getElementById("today");
  today.textContent = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long"
  }).format(now);
  today.dateTime = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now);
}
updateDate();
setInterval(updateDate, 60000);

document.getElementById("search-form").addEventListener("submit", (event) => {
  const input = document.getElementById("query");
  input.value = input.value.trim();
  if (!input.value) {
    event.preventDefault();
    input.focus();
  }
});

function weatherDescription(code, isDay) {
  if (code === 0) return ["맑음", isDay ? "☀️" : "🌙"];
  if (code <= 2) return ["구름 조금", isDay ? "🌤️" : "☁️"];
  if (code === 3) return ["흐림", "☁️"];
  if ([45, 48].includes(code)) return ["안개", "🌫️"];
  if ([51, 53, 55, 56, 57].includes(code)) return ["이슬비", "🌦️"];
  if ([61, 63, 65, 66, 67].includes(code)) return ["비", "🌧️"];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ["눈", "❄️"];
  if ([80, 81, 82].includes(code)) return ["소나기", "🌦️"];
  if ([95, 96, 99].includes(code)) return ["뇌우", "⛈️"];
  return ["날씨 정보 없음", "☁️"];
}

async function loadCity(city) {
  const card = document.getElementById(city.id);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  card.querySelector(".condition").textContent = "날씨를 불러오는 중…";
  try {
    const params = new URLSearchParams({
      latitude: city.latitude, longitude: city.longitude,
      current: "temperature_2m,weather_code,is_day",
      daily: "temperature_2m_max,temperature_2m_min",
      timezone: "Asia/Seoul", forecast_days: "1"
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error("날씨 요청 실패");
    const data = await response.json();
    const current = data.current;
    const min = data.daily?.temperature_2m_min?.[0];
    const max = data.daily?.temperature_2m_max?.[0];
    if (!current || ![current.temperature_2m, current.weather_code, min, max].every(Number.isFinite)) {
      throw new Error("날씨 데이터가 비어 있습니다.");
    }
    const [description, icon] = weatherDescription(current.weather_code, current.is_day);
    card.querySelector(".temperature").replaceChildren(document.createTextNode(Math.round(current.temperature_2m)));
    const unit = document.createElement("span");
    unit.textContent = "°C";
    card.querySelector(".temperature").append(unit);
    card.querySelector(".weather-icon").textContent = icon;
    card.querySelector(".condition").textContent = description;
    card.querySelector(".range").textContent = `최저 ${Math.round(min)}° · 최고 ${Math.round(max)}°`;
    return true;
  } catch (error) {
    // 예시 기온을 실제 날씨처럼 보여주지 않고 재시도를 안내합니다.
    card.querySelector(".temperature").textContent = "--°C";
    card.querySelector(".weather-icon").textContent = "☁️";
    card.querySelector(".condition").textContent = "날씨를 불러오지 못했어요";
    card.querySelector(".range").textContent = "인터넷 연결 후 다시 시도해 주세요";
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshWeather() {
  const button = document.getElementById("refresh-weather");
  if (button.disabled) return;
  button.disabled = true;
  const status = document.getElementById("weather-status");
  status.textContent = "서울과 제주 날씨를 확인하고 있어요.";
  try {
    const results = await Promise.all(cities.map(loadCity));
    const time = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" }).format(new Date());
    status.textContent = results.every(Boolean)
      ? `한국 시간 ${time} 확인 · 현재 기온 및 오늘의 최저·최고 기온`
      : "일부 날씨 정보를 가져오지 못했습니다. 새로고침으로 다시 시도할 수 있어요.";
  } finally {
    button.disabled = false;
  }
}
document.getElementById("refresh-weather").addEventListener("click", refreshWeather);
refreshWeather();
setInterval(refreshWeather, 10 * 60 * 1000);
