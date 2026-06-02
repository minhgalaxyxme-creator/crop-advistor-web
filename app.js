let cropProfiles = [];
let datasetInfo = {
  source: "Vietnam_Crop_Feature_Engineered.csv",
  rows: 0,
  features: [],
};

let metricConfig = {
  elevation: { label: "Độ cao", unit: "m", weight: 0.9 },
  temperature: { label: "Nhiệt độ", unit: "°C", weight: 1.2 },
  ph: { label: "Độ pH", unit: "", weight: 1.25 },
  nitrogen: { label: "Nitơ", unit: "g/kg", weight: 1 },
  clay: { label: "Sét", unit: "%", weight: 0.8 },
  sand: { label: "Cát", unit: "%", weight: 0.8 },
  silt: { label: "Thịt/bùn", unit: "%", weight: 0.8 },
  drySeasonDeficit: { label: "Thiếu nước mùa khô", unit: "mm", weight: 1.15 },
  acidificationRisk: { label: "Rủi ro chua/phèn", unit: "", weight: 1.15 },
  rainConcentrationIndex: { label: "Tập trung mưa", unit: "", weight: 0.9 },
};

const demoSamples = {
  lowland: {
    plantingMonth: 11,
    ph: 4.2,
    temperature: 28,
    nitrogen: 15,
    clay: 45,
    sand: 15,
    silt: 40,
    drySeasonDeficit: 100,
    acidificationRisk: 4000,
    rainConcentrationIndex: 0.85,
    elevation: 15,
  },
  highland: {
    plantingMonth: 5,
    ph: 5.2,
    temperature: 24.5,
    nitrogen: 35,
    clay: 35,
    sand: 30,
    silt: 35,
    drySeasonDeficit: 250,
    acidificationRisk: 2500,
    rainConcentrationIndex: 0.35,
    elevation: 550,
  },
};

const form = document.querySelector("#recommendationForm");
const resultList = document.querySelector("#resultList");
const barChart = document.querySelector("#barChart");
const radarChart = document.querySelector("#radarChart");
const cropCount = document.querySelector("#cropCount");
const scoreRing = document.querySelector("#scoreRing");
const chatbot = document.querySelector("#chatbot");
const chatToggle = document.querySelector("#chatToggle");
const chatClose = document.querySelector("#chatClose");
const chatMessages = document.querySelector("#chatMessages");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");

let latestInput = null;
let latestRanked = [];
let latestWarnings = [];

form.addEventListener("submit", (event) => {
  event.preventDefault();
  updateRecommendations();
});

document.querySelector("#demoLowland").addEventListener("click", () => {
  applySample(demoSamples.lowland);
  updateRecommendations();
});

document.querySelector("#demoHighland").addEventListener("click", () => {
  applySample(demoSamples.highland);
  updateRecommendations();
});

resultList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-toggle]");
  if (!button) return;

  const card = button.closest(".crop-card");
  const isOpen = card.classList.toggle("open");
  button.textContent = isOpen ? "Ẩn chi tiết phân tích" : "Xem chi tiết phân tích";
});

chatToggle.addEventListener("click", () => {
  openChatbot();
});

chatClose.addEventListener("click", () => {
  chatbot.classList.remove("open");
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitChatMessage(chatInput.value);
  chatInput.value = "";
});

document.querySelectorAll("[data-chat-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    submitChatMessage(button.dataset.chatPrompt);
  });
});

async function boot() {
  await loadMetadata();
  updateDatasetCounters();
  await updateRecommendations();
}

async function loadMetadata() {
  if (!window.location.protocol.startsWith("http")) {
    setOfflineFallbackProfiles();
    return;
  }

  const response = await fetch("/api/metadata");
  if (!response.ok) throw new Error("Không tải được metadata từ backend");
  const data = await response.json();
  cropProfiles = data.profiles;
  datasetInfo = {
    source: data.source,
    rows: data.rows,
    features: data.features,
  };
  metricConfig = data.featureConfig;
}

function updateDatasetCounters() {
  cropCount.textContent = cropProfiles.length;
  document.querySelector("#metricCount").textContent = Object.keys(metricConfig).length;
  document.querySelector("#recordCount").textContent = datasetInfo.rows.toLocaleString("vi-VN");
}

function readInputs() {
  const data = Object.fromEntries(new FormData(form).entries());
  Object.keys(metricConfig).forEach((key) => {
    data[key] = Number(data[key]);
  });
  data.plantingMonth = Number(data.plantingMonth);
  return data;
}

function applySample(sample) {
  Object.entries(sample).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field) field.value = value;
  });
}

async function updateRecommendations() {
  const input = readInputs();
  resultList.innerHTML = '<article class="crop-card open"><p>Đang tính toán bằng dữ liệu/model mới...</p></article>';

  try {
    const result = await requestRecommendation(input);
    latestInput = result.input;
    latestRanked = result.ranking;
    latestWarnings = result.warnings || [];
  } catch (error) {
    latestInput = input;
    latestRanked = cropProfiles.map((crop) => scoreCropOffline(crop, input)).sort((a, b) => b.score - a.score);
    latestWarnings = ["Backend chưa sẵn sàng, đang dùng mô phỏng offline theo phân vị dữ liệu."];
  }

  renderSummary(latestRanked[0]);
  renderBars(latestRanked);
  renderRadar(latestRanked[0]);
  renderResults(latestRanked);
}

async function requestRecommendation(input) {
  if (!window.location.protocol.startsWith("http")) throw new Error("Không có server HTTP");

  const response = await fetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Không gọi được API gợi ý");
  return data;
}

function scoreCropOffline(crop, input) {
  const detail = Object.entries(metricConfig).map(([key, config]) => {
    const [min, optimal, max] = crop.metrics[key];
    const value = input[key];
    const score = scoreValue(value, min, optimal, max);
    return {
      key,
      label: config.label,
      unit: config.unit,
      value,
      min,
      optimal,
      max,
      score,
      weighted: score * config.weight,
      weight: config.weight,
    };
  });

  const weightedScore = detail.reduce((sum, item) => sum + item.weighted, 0) / detail.reduce((sum, item) => sum + item.weight, 0);
  const score = clamp(Math.round(weightedScore * softPenaltyMultiplier(crop.datasetLabel, input)), 0, 100);

  return {
    ...crop,
    score,
    level: getLevel(score),
    detail,
    strong: [...detail].sort((a, b) => b.score - a.score)[0],
    weak: [...detail].sort((a, b) => a.score - b.score)[0],
    isSeasonMatch: crop.months.includes(input.plantingMonth),
  };
}

function scoreValue(value, min, optimal, max) {
  if (value === optimal) return 100;
  if (value < min || value > max) {
    const nearest = value < min ? min : max;
    const span = Math.max(max - min, 1);
    const penalty = (Math.abs(value - nearest) / span) * 100;
    return clamp(Math.round(55 - penalty), 0, 55);
  }

  const span = value < optimal ? optimal - min : max - optimal;
  const distance = Math.abs(value - optimal);
  return clamp(Math.round(100 - (distance / span) * 38), 60, 100);
}

function softPenaltyMultiplier(cropLabel, input) {
  let multiplier = 1;
  if (input.drySeasonDeficit > 200) {
    if (cropLabel === "Rice") multiplier *= 0.3;
    if (cropLabel === "Maize") multiplier *= 0.8;
  }
  if (input.acidificationRisk > 3000 || input.ph < 4.5) {
    if (cropLabel === "Pepper") multiplier *= 0.4;
    if (cropLabel === "Coffee") multiplier *= 0.5;
    if (cropLabel === "Rubber") multiplier *= 1.1;
  }
  if (input.nitrogen < 20 && cropLabel === "Coffee") multiplier *= 0.7;
  return multiplier;
}

function getLevel(score) {
  if (score >= 88) return "Rất phù hợp";
  if (score >= 74) return "Phù hợp";
  if (score >= 58) return "Có thể cân nhắc";
  return "Không ưu tiên";
}

function renderSummary(best) {
  if (!best) return;
  document.querySelector("#bestIcon").textContent = best.icon;
  document.querySelector("#bestCropName").textContent = best.name;
  document.querySelector("#bestCropReason").textContent = best.description;
  document.querySelector("#bestScore").textContent = `${best.score}%`;
  document.querySelector("#bestLevel").textContent = best.level;
  document.querySelector("#strongMetric").textContent = formatMetricSummary(best.strong);
  document.querySelector("#weakMetric").textContent = formatWeakMetric(best);
  document.querySelector("#bestSeason").textContent = best.season;

  const circumference = 326.73;
  scoreRing.style.strokeDashoffset = circumference - (best.score / 100) * circumference;
}

function renderBars(ranked) {
  barChart.innerHTML = ranked.map((crop) => `
    <div class="bar-row">
      <div class="bar-label"><span>${crop.icon}</span><strong>${crop.name}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width: ${crop.score}%"></div></div>
      <div class="bar-value">${crop.score}%</div>
    </div>
  `).join("");
}

function renderRadar(best) {
  const axes = [
    { label: "pH", score: getDetailScore(best, "ph") },
    { label: "Nhiệt", score: getDetailScore(best, "temperature") },
    { label: "Nước", score: getDetailScore(best, "drySeasonDeficit") },
    { label: "Chua", score: getDetailScore(best, "acidificationRisk") },
    { label: "Đất", score: Math.round((getDetailScore(best, "clay") + getDetailScore(best, "sand") + getDetailScore(best, "silt")) / 3) },
    { label: "Nitơ", score: getDetailScore(best, "nitrogen") },
  ];

  const center = { x: 180, y: 145 };
  const radius = 92;
  const rings = [0.25, 0.5, 0.75, 1];
  const points = axes.map((axis, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
    const distance = radius * (axis.score / 100);
    return { x: center.x + Math.cos(angle) * distance, y: center.y + Math.sin(angle) * distance };
  });

  const ringMarkup = rings.map((scale) => {
    const ringPoints = axes.map((_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
      return `${center.x + Math.cos(angle) * radius * scale},${center.y + Math.sin(angle) * radius * scale}`;
    }).join(" ");
    return `<polygon class="radar-grid" points="${ringPoints}"></polygon>`;
  }).join("");

  const axisMarkup = axes.map((axis, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
    const endX = center.x + Math.cos(angle) * radius;
    const endY = center.y + Math.sin(angle) * radius;
    const labelX = center.x + Math.cos(angle) * (radius + 32);
    const labelY = center.y + Math.sin(angle) * (radius + 32);
    return `
      <line class="radar-axis" x1="${center.x}" y1="${center.y}" x2="${endX}" y2="${endY}"></line>
      <text class="radar-label" x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle">${axis.label}</text>
    `;
  }).join("");

  radarChart.innerHTML = `
    ${ringMarkup}
    ${axisMarkup}
    <polygon class="radar-shape" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}"></polygon>
    ${points.map((point) => `<circle class="radar-dot" cx="${point.x}" cy="${point.y}" r="4"></circle>`).join("")}
  `;
}

function renderResults(ranked) {
  const warningMarkup = latestWarnings.length ? `<div class="model-warning"><strong>Cảnh báo model:</strong> ${latestWarnings.join(" ")}</div>` : "";
  resultList.innerHTML = warningMarkup + ranked.map((crop, index) => {
    const detailMarkup = crop.detail.map((item) => `
      <div class="metric-card">
        <div class="metric-top"><strong>${item.label}</strong><span>${item.score}%</span></div>
        <div class="metric-values">
          <span>Của bạn: ${formatValue(item.value)}${item.unit}</span>
          <span>Vùng tốt: ${formatValue(item.min)}-${formatValue(item.max)}${item.unit}</span>
        </div>
        <div class="mini-track"><div class="mini-fill" style="width: ${item.score}%"></div></div>
      </div>
    `).join("");

    return `
      <article class="crop-card ${index === 0 ? "recommended open" : ""}">
        <div class="crop-head">
          <div class="crop-icon">${crop.icon}</div>
          <div class="crop-title">
            <h3>
              ${crop.name}
              ${index === 0 ? '<span class="badge">Tối ưu nhất</span>' : ""}
              ${crop.isSeasonMatch ? '<span class="badge">Đúng mùa dữ liệu</span>' : ""}
            </h3>
            <p>${crop.description}</p>
          </div>
          <div class="crop-score"><strong>${crop.score}%</strong><span>${crop.level}</span></div>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width: ${crop.score}%"></div></div>
        <div class="crop-meta">
          <span>Mùa dữ liệu: ${crop.season}</span>
          <span>Dữ liệu: ${crop.count.toLocaleString("vi-VN")} dòng</span>
          <span>Mạnh nhất: ${crop.strong.label}</span>
          <span>Cần cân nhắc: ${formatWeakMetric(crop)}</span>
        </div>
        <button class="detail-toggle" type="button" data-toggle>${index === 0 ? "Ẩn chi tiết phân tích" : "Xem chi tiết phân tích"}</button>
        <div class="detail-grid">${detailMarkup}</div>
      </article>
    `;
  }).join("");
}

function getDetailScore(crop, key) {
  return crop?.detail.find((item) => item.key === key)?.score ?? 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatValue(value) {
  return Number.isInteger(value) ? value : Number(value).toFixed(2).replace(/\.00$/, "");
}

function formatMetricSummary(metric) {
  return `${metric.label} (${metric.score}%)`;
}

function formatWeakMetric(crop) {
  if (crop.weak.score >= 88) return "Không có chỉ số yếu rõ ràng";
  return formatMetricSummary(crop.weak);
}

function openChatbot() {
  chatbot.classList.add("open");
  if (!chatMessages.querySelector(".chat-message")) {
    addChatMessage("bot", "Chào bạn. Tôi có thể giải thích kết quả gợi ý cây trồng dựa trên bộ dữ liệu feature-engineered và bộ lọc soft penalty mới.");
  }
  setTimeout(() => chatInput.focus(), 50);
}

async function submitChatMessage(rawMessage) {
  const message = rawMessage.trim();
  if (!message) return;

  addChatMessage("user", message);
  const pendingBubble = addChatMessage("bot", "Đang hỏi Gemini...");
  const geminiReply = await requestGeminiReply(message);
  pendingBubble.textContent = geminiReply ?? createChatReply(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addChatMessage(author, text) {
  const row = document.createElement("div");
  row.className = `chat-message ${author}`;
  const label = document.createElement("strong");
  label.textContent = author === "user" ? "Bạn" : "Trợ lý";
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.textContent = text;
  row.append(label, bubble);
  chatMessages.append(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble;
}

async function requestGeminiReply(message) {
  if (!window.location.protocol.startsWith("http")) return null;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context: buildChatContext() }),
    });

    const data = await response.json();
    if (!response.ok) return `${createChatReply(message)}\n\nLưu ý: ${data.error || "Gemini chưa sẵn sàng."}`;
    return data.reply;
  } catch (error) {
    return `${createChatReply(message)}\n\nGemini chưa kết nối được, nên tôi đang dùng trả lời mô phỏng offline.`;
  }
}

function buildChatContext() {
  return {
    input: latestInput,
    dataset: datasetInfo,
    warnings: latestWarnings,
    ranking: latestRanked.map((crop) => ({
      name: crop.name,
      datasetLabel: crop.datasetLabel,
      score: crop.score,
      level: crop.level,
      season: crop.season,
      count: crop.count,
      strongMetric: formatMetricSummary(crop.strong),
      weakMetric: formatWeakMetric(crop),
      detail: crop.detail.map((item) => ({
        label: item.label,
        value: `${formatValue(item.value)}${item.unit}`,
        optimal: `${formatValue(item.optimal)}${item.unit}`,
        score: item.score,
      })),
    })),
  };
}

function createChatReply(message) {
  if (!latestRanked.length) return "Bạn hãy nhập thông số và bấm Tìm cây trồng phù hợp trước, sau đó tôi sẽ phân tích kết quả.";

  const text = normalizeText(message);
  const best = latestRanked[0];
  const topThree = latestRanked.slice(0, 3).map((crop, index) => `${index + 1}. ${crop.name}: ${crop.score}%`).join("\n");

  if (text.includes("model") || text.includes("du lieu") || text.includes("api")) {
    return `Web đang dùng ${datasetInfo.source} với ${datasetInfo.rows.toLocaleString("vi-VN")} dòng và ${Object.keys(metricConfig).length} đặc trưng đúng theo bộ model mới. Kết quả còn áp dụng soft penalty cho khô hạn, chua/phèn và thiếu Nitơ.`;
  }

  if (text.includes("tom tat") || text.includes("ket qua") || text.includes("top")) {
    return `Tóm tắt kết quả hiện tại:\n${topThree}\n\nCây tối ưu nhất là ${best.name} (${best.score}%, ${best.level}). Cảnh báo: ${latestWarnings.join(" ")}`;
  }

  if (text.includes("nen trong") || text.includes("toi uu") || text.includes("cay nao") || text.includes("khuyen nghi")) {
    return `Bạn nên ưu tiên ${best.name}. Điểm phù hợp hiện tại là ${best.score}%.\n\nLý do: ${best.description}\nMùa dữ liệu gợi ý: ${best.season}.`;
  }

  if (text.includes("cai thien") || text.includes("can can nhac") || text.includes("yeu") || text.includes("thap")) {
    if (best.weak.score >= 88) return `Với ${best.name}, chưa có chỉ số yếu rõ ràng. Chỉ số thấp nhất vẫn đạt ${best.weak.score}% (${best.weak.label}).`;
    return `Chỉ số cần cân nhắc nhất cho ${best.name} là ${best.weak.label}, đang đạt ${best.weak.score}%.\n\n${getMetricAdvice(best.weak)}`;
  }

  const mentionedCrop = latestRanked.find((crop) => normalizeText(crop.name).split(" ").every((part) => text.includes(part)));
  if (mentionedCrop) {
    return `${mentionedCrop.name} hiện đạt ${mentionedCrop.score}% (${mentionedCrop.level}).\nMùa dữ liệu: ${mentionedCrop.season}.\nĐiểm mạnh nhất: ${formatMetricSummary(mentionedCrop.strong)}.\nCần cân nhắc: ${formatWeakMetric(mentionedCrop)}.`;
  }

  return `Bạn có thể hỏi: "Tôi nên trồng cây nào?", "Chỉ số nào cần cải thiện?", hoặc "Tóm tắt kết quả hiện tại". Hiện cây tốt nhất là ${best.name} với ${best.score}%.`;
}

function getMetricAdvice(metric) {
  const valueText = `Giá trị hiện tại: ${formatValue(metric.value)}${metric.unit}. Vùng tốt trong dữ liệu: ${formatValue(metric.min)}-${formatValue(metric.max)}${metric.unit}, trung vị gần ${formatValue(metric.optimal)}${metric.unit}.`;
  const adviceByKey = {
    ph: "Cần đo lại đất, cải tạo pH/chua phèn theo khuyến cáo địa phương trước khi bón vôi hoặc vật liệu hữu cơ.",
    temperature: "Nhiệt độ khó điều chỉnh, nên cân nhắc mùa vụ, độ cao và giống chịu nhiệt/chịu mát.",
    nitrogen: "Có thể cải thiện bằng phân hữu cơ, phân đạm hoặc cây họ đậu, nhưng nên dựa trên xét nghiệm đất.",
    clay: "Đất nhiều sét cần chú ý thoát nước, tránh úng và tăng hữu cơ để cải thiện cấu trúc.",
    sand: "Đất nhiều cát thường thoát nước nhanh, nên tăng hữu cơ và giữ ẩm.",
    silt: "Cân bằng cơ giới đất bằng hữu cơ, che phủ và quản lý xói mòn.",
    drySeasonDeficit: "Cần kế hoạch tưới, trữ nước hoặc chọn cây chịu hạn tốt hơn.",
    acidificationRisk: "Nên kiểm tra phèn/chua tại ruộng, ưu tiên cây chịu chua hơn nếu rủi ro cao.",
    rainConcentrationIndex: "Mưa tập trung làm tăng rủi ro khô/úng theo mùa, cần lịch tưới tiêu phù hợp.",
    elevation: "Độ cao không thể điều chỉnh, đây là chỉ số quan trọng để chọn cây và giống phù hợp.",
  };
  return `${valueText}\n${adviceByKey[metric.key] ?? "Nên kiểm tra lại dữ liệu đầu vào và so sánh với cây khác trong danh sách."}`;
}

function normalizeText(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}

function setOfflineFallbackProfiles() {
  cropProfiles = [
    { datasetLabel: "Rice", name: "Lúa", icon: "🌾", description: "Cây lương thực chính, ưu tiên vùng thấp và điều kiện nước thuận lợi.", season: "Tháng 2, 4, 7, 11", months: [2, 4, 7, 11], count: 2100, metrics: { elevation: [1, 3, 25], temperature: [23.6, 27.6, 28.1], ph: [5.4, 5.9, 6.2], nitrogen: [22.8, 30.8, 41.5], clay: [30.6, 35.6, 40.8], sand: [20, 26.5, 32], silt: [30, 36, 42], drySeasonDeficit: [20, 80, 160], acidificationRisk: [1800, 2600, 3800], rainConcentrationIndex: [0.3, 0.55, 0.85] } },
  ];
  datasetInfo.rows = 2100;
}

boot();
