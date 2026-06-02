const cropProfiles = [
  {
    name: "Lúa",
    datasetLabel: "Rice",
    icon: "🌾",
    description: "Cây lương thực chính, xuất hiện nhiều ở ĐBSCL và ĐBSH trong dữ liệu mới.",
    season: "Tháng 2, 4, 7 hoặc 11",
    months: [2, 4, 7, 11],
    regions: ["DBSCL", "DBSH"],
    count: 2280,
    metrics: {
      ph: [5.4, 5.9, 6.2],
      temperature: [23.6, 27.61, 28.08],
      humidity: [79.32, 82.32, 83.73],
      nitrogen: [22.8, 30.8, 41.5],
      clay: [30.6, 35.6, 40.8],
      sand: [20.0, 26.5, 32.0],
      rainfall: [1494.47, 1802.65, 2300.36],
      elevation: [1.0, 3.0, 25.0],
    },
  },
  {
    name: "Bắp",
    datasetLabel: "Maize",
    icon: "🌽",
    description: "Cây ngắn ngày, trong dữ liệu xuất hiện ở ĐBSH và Tây Nguyên.",
    season: "Tháng 5 hoặc 9",
    months: [5, 9],
    regions: ["DBSH", "Tay_Nguyen"],
    count: 1147,
    metrics: {
      ph: [5.4, 5.9, 6.1],
      temperature: [22.38, 23.88, 24.81],
      humidity: [82.32, 83.73, 86.45],
      nitrogen: [20.3, 25.6, 35.6],
      clay: [28.8, 32.8, 36.0],
      sand: [25.4, 30.3, 36.2],
      rainfall: [1479.78, 1676.24, 2230.25],
      elevation: [2.0, 34.0, 833.8],
    },
  },
  {
    name: "Hồ tiêu",
    datasetLabel: "Pepper",
    icon: "🌶️",
    description: "Cây gia vị lâu năm, phù hợp nhóm mẫu Tây Nguyên có độ ẩm cao.",
    season: "Tháng 6",
    months: [6],
    regions: ["Tay_Nguyen"],
    count: 363,
    metrics: {
      ph: [5.3, 5.6, 5.9],
      temperature: [21.92, 23.46, 25.86],
      humidity: [82.59, 85.67, 88.25],
      nitrogen: [20.2, 27.6, 40.2],
      clay: [28.92, 32.9, 36.0],
      sand: [32.3, 34.7, 37.7],
      rainfall: [1733.8, 2120.84, 2631.59],
      elevation: [206.0, 586.0, 1083.0],
    },
  },
  {
    name: "Cao su",
    datasetLabel: "Rubber",
    icon: "🌳",
    description: "Cây công nghiệp dài ngày, tập trung trong nhóm mẫu Tây Nguyên.",
    season: "Tháng 5-6",
    months: [5, 6],
    regions: ["Tay_Nguyen"],
    count: 362,
    metrics: {
      ph: [5.3, 5.6, 5.9],
      temperature: [21.92, 23.46, 25.44],
      humidity: [82.59, 85.43, 88.25],
      nitrogen: [20.3, 28.5, 39.69],
      clay: [28.63, 33.0, 35.89],
      sand: [32.3, 34.8, 37.9],
      rainfall: [1733.8, 2120.84, 2725.96],
      elevation: [224.1, 648.5, 1090.1],
    },
  },
  {
    name: "Cà phê",
    datasetLabel: "Coffee",
    icon: "☕",
    description: "Cây công nghiệp dài ngày, hợp cao nguyên mát và lượng mưa khá.",
    season: "Tháng 5-6",
    months: [5, 6],
    regions: ["Tay_Nguyen"],
    count: 348,
    metrics: {
      ph: [5.3, 5.6, 5.9],
      temperature: [21.92, 23.46, 25.44],
      humidity: [82.59, 85.67, 88.25],
      nitrogen: [20.1, 26.65, 40.23],
      clay: [28.7, 32.8, 36.2],
      sand: [32.37, 34.85, 37.53],
      rainfall: [1640.82, 2120.84, 2631.59],
      elevation: [223.0, 626.5, 1146.0],
    },
  },
];

const datasetInfo = {
  source: "Vietnam_Crop_Dataset_Cleaned.csv",
  rows: 4500,
};

const metricConfig = {
  ph: { label: "Độ pH", unit: "", weight: 1.25 },
  temperature: { label: "Nhiệt độ", unit: "°C", weight: 1.25 },
  humidity: { label: "Độ ẩm", unit: "%", weight: 1 },
  nitrogen: { label: "Nitơ", unit: "g/kg", weight: 0.95 },
  clay: { label: "Sét", unit: "%", weight: 0.85 },
  sand: { label: "Cát", unit: "%", weight: 0.85 },
  rainfall: { label: "Lượng mưa", unit: "mm", weight: 1.1 },
  elevation: { label: "Độ cao", unit: "m", weight: 0.8 },
};

const demoSamples = {
  lowland: {
    region: "DBSCL",
    plantingMonth: 4,
    ph: 5.9,
    temperature: 27.6,
    humidity: 82.3,
    nitrogen: 30.8,
    clay: 35.6,
    sand: 26.5,
    rainfall: 1803,
    elevation: 3,
  },
  highland: {
    region: "Tay_Nguyen",
    plantingMonth: 6,
    ph: 5.6,
    temperature: 23.5,
    humidity: 85.7,
    nitrogen: 27.6,
    clay: 32.9,
    sand: 34.7,
    rainfall: 2121,
    elevation: 586,
  },
};

const regionLabels = {
  DBSCL: "ĐBSCL",
  DBSH: "ĐBSH",
  Tay_Nguyen: "Tây Nguyên",
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

cropCount.textContent = cropProfiles.length;
document.querySelector("#recordCount").textContent = datasetInfo.rows.toLocaleString("vi-VN");

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

function updateRecommendations() {
  const input = readInputs();
  const ranked = cropProfiles
    .map((crop) => scoreCrop(crop, input))
    .sort((a, b) => b.score - a.score);

  latestInput = input;
  latestRanked = ranked;
  renderSummary(ranked[0]);
  renderBars(ranked);
  renderRadar(ranked[0]);
  renderResults(ranked);
}

// Replace this function later with your trained model or API prediction output.
function scoreCrop(crop, input) {
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

  const weightedScore =
    detail.reduce((sum, item) => sum + item.weighted, 0) /
    detail.reduce((sum, item) => sum + item.weight, 0);

  const seasonBonus = crop.months.includes(input.plantingMonth) ? 5 : -5;
  const regionBonus = crop.regions.includes(input.region) ? 4 : -4;
  const score = clamp(Math.round(weightedScore + seasonBonus + regionBonus), 0, 100);

  return {
    ...crop,
    score,
    level: getLevel(score),
    detail,
    strong: [...detail].sort((a, b) => b.score - a.score)[0],
    weak: [...detail].sort((a, b) => a.score - b.score)[0],
    isSeasonMatch: crop.months.includes(input.plantingMonth),
    isRegionMatch: crop.regions.includes(input.region),
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

function getLevel(score) {
  if (score >= 88) return "Rất phù hợp";
  if (score >= 74) return "Phù hợp";
  if (score >= 58) return "Có thể cân nhắc";
  return "Không ưu tiên";
}

function renderSummary(best) {
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
  barChart.innerHTML = ranked
    .map(
      (crop) => `
        <div class="bar-row">
          <div class="bar-label">
            <span>${crop.icon}</span>
            <strong>${crop.name}</strong>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${crop.score}%"></div>
          </div>
          <div class="bar-value">${crop.score}%</div>
        </div>
      `,
    )
    .join("");
}

function renderRadar(best) {
  const axes = [
    { label: "pH", score: getDetailScore(best, "ph") },
    { label: "Nhiệt", score: getDetailScore(best, "temperature") },
    { label: "Ẩm", score: getDetailScore(best, "humidity") },
    { label: "Nước", score: getDetailScore(best, "rainfall") },
    { label: "Đất", score: Math.round((getDetailScore(best, "clay") + getDetailScore(best, "sand")) / 2) },
    { label: "Nitơ", score: getDetailScore(best, "nitrogen") },
  ];

  const center = { x: 180, y: 145 };
  const radius = 92;
  const rings = [0.25, 0.5, 0.75, 1];

  const points = axes.map((axis, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
    const distance = radius * (axis.score / 100);
    return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance,
    };
  });

  const ringMarkup = rings
    .map((scale) => {
      const ringPoints = axes
        .map((_, index) => {
          const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
          return `${center.x + Math.cos(angle) * radius * scale},${center.y + Math.sin(angle) * radius * scale}`;
        })
        .join(" ");
      return `<polygon class="radar-grid" points="${ringPoints}"></polygon>`;
    })
    .join("");

  const axisMarkup = axes
    .map((axis, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
      const endX = center.x + Math.cos(angle) * radius;
      const endY = center.y + Math.sin(angle) * radius;
      const labelX = center.x + Math.cos(angle) * (radius + 32);
      const labelY = center.y + Math.sin(angle) * (radius + 32);
      return `
        <line class="radar-axis" x1="${center.x}" y1="${center.y}" x2="${endX}" y2="${endY}"></line>
        <text class="radar-label" x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle">${axis.label}</text>
      `;
    })
    .join("");

  radarChart.innerHTML = `
    ${ringMarkup}
    ${axisMarkup}
    <polygon class="radar-shape" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}"></polygon>
    ${points.map((point) => `<circle class="radar-dot" cx="${point.x}" cy="${point.y}" r="4"></circle>`).join("")}
  `;
}

function renderResults(ranked) {
  resultList.innerHTML = ranked
    .map((crop, index) => {
      const detailMarkup = crop.detail
        .map(
          (item) => `
            <div class="metric-card">
              <div class="metric-top">
                <strong>${item.label}</strong>
                <span>${item.score}%</span>
              </div>
              <div class="metric-values">
                <span>Của bạn: ${formatValue(item.value)}${item.unit}</span>
                <span>Tối ưu: ${formatValue(item.optimal)}${item.unit}</span>
              </div>
              <div class="mini-track">
                <div class="mini-fill" style="width: ${item.score}%"></div>
              </div>
            </div>
          `,
        )
        .join("");

      return `
        <article class="crop-card ${index === 0 ? "recommended open" : ""}">
          <div class="crop-head">
            <div class="crop-icon">${crop.icon}</div>
            <div class="crop-title">
              <h3>
                ${crop.name}
                ${index === 0 ? '<span class="badge">Tối ưu nhất</span>' : ""}
                ${crop.isSeasonMatch ? '<span class="badge">Đúng mùa</span>' : ""}
              </h3>
              <p>${crop.description}</p>
            </div>
            <div class="crop-score">
              <strong>${crop.score}%</strong>
              <span>${crop.level}</span>
            </div>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${crop.score}%"></div>
          </div>
          <div class="crop-meta">
            <span>Mùa vụ: ${crop.season}</span>
            <span>Vùng dữ liệu: ${formatRegions(crop.regions)}</span>
            <span>Dữ liệu: ${crop.count.toLocaleString("vi-VN")} dòng</span>
            <span>Mạnh nhất: ${crop.strong.label}</span>
            <span>Cần cân nhắc: ${formatWeakMetric(crop)}</span>
          </div>
          <button class="detail-toggle" type="button" data-toggle>
            ${index === 0 ? "Ẩn chi tiết phân tích" : "Xem chi tiết phân tích"}
          </button>
          <div class="detail-grid">${detailMarkup}</div>
        </article>
      `;
    })
    .join("");
}

function getDetailScore(crop, key) {
  return crop.detail.find((item) => item.key === key)?.score ?? 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatValue(value) {
  return Number.isInteger(value) ? value : value.toFixed(1);
}

function formatRegions(regions) {
  return regions.map((region) => regionLabels[region] ?? region).join(", ");
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
    addChatMessage(
      "bot",
      "Chào bạn. Tôi là trợ lý mô phỏng cho hệ thống gợi ý cây trồng. Bạn có thể hỏi cây nào tối ưu, vì sao cây đó được chọn, hoặc chỉ số nào cần cải thiện.",
    );
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
      body: JSON.stringify({
        message,
        context: buildChatContext(),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return `${createChatReply(message)}\n\nLưu ý: ${data.error || "Gemini chưa sẵn sàng."}`;
    }

    return data.reply;
  } catch (error) {
    return `${createChatReply(message)}\n\nGemini chưa kết nối được, nên tôi đang dùng trả lời mô phỏng offline.`;
  }
}

function buildChatContext() {
  return {
    input: latestInput,
    dataset: datasetInfo,
    ranking: latestRanked.map((crop) => ({
      name: crop.name,
      datasetLabel: crop.datasetLabel,
      score: crop.score,
      level: crop.level,
      season: crop.season,
      regions: formatRegions(crop.regions),
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
  if (!latestRanked.length) {
    return "Bạn hãy nhập thông số khu vực và bấm Tìm cây trồng phù hợp trước, sau đó tôi sẽ phân tích kết quả cho bạn.";
  }

  const text = normalizeText(message);
  const best = latestRanked[0];
  const topThree = latestRanked
    .slice(0, 3)
    .map((crop, index) => `${index + 1}. ${crop.name}: ${crop.score}%`)
    .join("\n");

  if (text.includes("chay") || text.includes("run") || text.includes("cmd") || text.includes("mo web")) {
    return "Để chạy web, mở CMD và nhập:\nstart \"\" \"C:\\Users\\ASUS\\Downloads\\crop-advisor-web\\index.html\"\n\nWeb hiện là HTML/CSS/JS tĩnh nên không cần cài server.";
  }

  if (text.includes("model") || text.includes("api") || text.includes("ai that")) {
    return "Hiện chatbot đang chạy mô phỏng ngay trên trình duyệt. Khi có model thật, nên tạo backend API để nhận dữ liệu đầu vào, gọi model, rồi trả về danh sách cây và điểm phù hợp. Không nên đặt API key hoặc model server trực tiếp trong file HTML/JS public.";
  }

  if (text.includes("tom tat") || text.includes("ket qua") || text.includes("top")) {
    return `Tóm tắt kết quả hiện tại:\n${topThree}\n\nCây đang tối ưu nhất là ${best.name} với ${best.score}%, mức đánh giá: ${best.level}.`;
  }

  if (text.includes("nen trong") || text.includes("toi uu") || text.includes("cay nao") || text.includes("khuyen nghi")) {
    return `Bạn nên ưu tiên ${best.name}. Điểm phù hợp hiện tại là ${best.score}%.\n\nLý do: ${best.description}\nMùa vụ gợi ý: ${best.season}\nVùng dữ liệu phù hợp: ${formatRegions(best.regions)}.`;
  }

  if (text.includes("cai thien") || text.includes("can can nhac") || text.includes("yeu") || text.includes("thap")) {
    if (best.weak.score >= 88) {
      return `Với ${best.name}, chưa có chỉ số yếu rõ ràng. Chỉ số thấp nhất vẫn đạt ${best.weak.score}% (${best.weak.label}), nên hiện tại điều kiện đầu vào khá cân bằng.`;
    }

    return `Chỉ số cần cân nhắc nhất cho ${best.name} là ${best.weak.label}, đang đạt ${best.weak.score}%.\n\n${getMetricAdvice(best.weak)}`;
  }

  const mentionedCrop = latestRanked.find((crop) => normalizeText(crop.name).split(" ").every((part) => text.includes(part)));
  if (mentionedCrop) {
    return `${mentionedCrop.name} hiện đạt ${mentionedCrop.score}% (${mentionedCrop.level}).\nMùa vụ gợi ý: ${mentionedCrop.season}.\nĐiểm mạnh nhất: ${formatMetricSummary(mentionedCrop.strong)}.\nCần cân nhắc: ${formatWeakMetric(mentionedCrop)}.`;
  }

  return `Tôi đang trả lời bằng bộ luật mô phỏng dựa trên kết quả hiện tại. Bạn có thể hỏi: "Tôi nên trồng cây nào?", "Chỉ số nào cần cải thiện?", hoặc "Tóm tắt kết quả hiện tại".\n\nHiện cây tốt nhất là ${best.name} với ${best.score}%.`;
}

function getMetricAdvice(metric) {
  const valueText = `Giá trị hiện tại: ${formatValue(metric.value)}${metric.unit}. Khoảng tốt của dữ liệu mẫu: ${formatValue(metric.min)}-${formatValue(metric.max)}${metric.unit}, tối ưu gần ${formatValue(metric.optimal)}${metric.unit}.`;

  const adviceByKey = {
    ph: "Có thể cân nhắc cải tạo pH bằng vôi nông nghiệp hoặc vật liệu hữu cơ, nhưng cần đo lại đất trước khi điều chỉnh.",
    temperature: "Nhiệt độ là yếu tố khó điều chỉnh, nên cân nhắc mùa vụ, giống chịu nhiệt hoặc chuyển cây phù hợp hơn.",
    humidity: "Có thể điều chỉnh một phần bằng mật độ trồng, che phủ, tưới và thoát nước.",
    nitrogen: "Có thể cải thiện bằng phân hữu cơ, phân đạm hoặc cây họ đậu, nhưng nên dựa trên xét nghiệm đất.",
    clay: "Tỷ lệ sét cao dễ giữ nước; cần chú ý thoát nước và bổ sung hữu cơ để đất tơi hơn.",
    sand: "Đất nhiều cát thường thoát nước nhanh; nên tăng hữu cơ và giữ ẩm tốt hơn.",
    rainfall: "Lượng mưa lệch nhiều cần bổ sung tưới, trữ nước hoặc chọn cây chịu hạn/chịu úng.",
    elevation: "Độ cao không thể điều chỉnh, vì vậy đây là chỉ số dùng để chọn cây và vùng trồng phù hợp.",
  };

  return `${valueText}\n${adviceByKey[metric.key] ?? "Nên kiểm tra lại dữ liệu đầu vào và so sánh với cây khác trong danh sách."}`;
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

updateRecommendations();
