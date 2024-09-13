document.addEventListener("DOMContentLoaded", () => {
  main().catch((error) => alert(`ERROR: ${error.message}`));
});

async function main() {
  const data = await fetchCSVWithProgress(
    "./assets/data/extracted-data.csv",
    updateLoadingProgress
  );
  const content = await data.text();

  hideLoading();

  const transactions = parseCSV(content);
  generateSummary(transactions);
  renderTable(transactions);
}

function updateLoadingProgress({ loaded, total, speed }) {
  const loadingDiv = document.querySelector("#loading");
  loadingDiv.textContent = `Đang tải dữ liệu... ${formatSize(
    loaded
  )}/${formatSize(total)} (${formatSize(speed)}/s)`;
}

function hideLoading() {
  document.querySelector("#loading").style.display = "none";
}

function parseCSV(content) {
  return content
    .split("\n")
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const [date, docNumber, money, transactionsInDetail, page] =
        line.split(",");
      return {
        date,
        docNumber,
        money,
        transactionsInDetail,
        page,
      };
    });
}

function renderTable(transactions) {
  const table = new DataTable("#tblResult", {
    searchHighlight: true,
    data: transactions,
    columns: [
      { data: "date", name: "date" },
      { data: "docNumber", name: "docNumber" },
      {
        data: "money",
        render: (amount, type) => {
          var number = DataTable.render
            .number(",", ".", 0, "", "")
            .display(amount);
          return number;
        },
      },
      { data: "transactionsInDetail", name: "transactionsInDetail" },
      { data: "page", name: "page" },
    ],
    columnDefs: [
      { width: "14%", targets: 0 },
      { width: "15%", targets: 1 },
      { width: "15%", targets: 2 },
      { width: "15%", targets: 4 },
    ],
    pageLength: 25,
    order: [[2, "desc"]],
    language: {
      searchPlaceholder:
        "Tìm kiếm theo ngày giao dịch, mã giao dịch, số tiền hoặc chi tiết giao dịch",
      emptyTable: "Không tìm thấy dữ liệu",
      info: "Hiển thị từ _START_ đến _END_ trong tổng số _TOTAL_ bản ghi",
      infoEmpty: "Không có bản ghi nào",
      infoFiltered: "(filtered from _MAX_ total entries)",
      infoPostFix: "",
      thousands: ",",
      lengthMenu: "Số bản ghi tối đa trên trang: _MENU_",
      loadingRecords: "Đang tải dữ liệu...",
      processing: "",
      search: "",
      zeroRecords: "Không tìm thấy dữ liệu",
      paginate: {
        first: "Trang đầu",
        last: "Trang cuối",
        next: "Trang sau",
        previous: "Trước trước",
      },
      aria: {
        orderable: "Sắp xếp theo thứ tự tăng dần",
        orderableReverse: "Sắp xếp theo thứ tự giảm dần",
      },
    },
  });

  table.on("draw", () => {
    const body = $(table.table().body());
    body.unhighlight();
    body.highlight(table.search());
  });
}

async function fetchCSVWithProgress(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Error: ${response.status} - ${response.statusText}`);

  const total = parseInt(response.headers.get("content-length"), 10);
  const reader = response.body.getReader();
  let loaded = 0;
  const chunks = [];
  const startTime = Date.now();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    loaded += value.byteLength;
    const elapsed = (Date.now() - startTime + 1) / 1000;
    onProgress({ loaded, total, speed: loaded / elapsed });
    chunks.push(value);
  }

  return new Blob(chunks, { type: response.headers.get("content-type") });
}

function formatSize(size, fixed = 0) {
  if (!size) return "?";
  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(fixed)}${units[unitIndex]}`;
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatMoney(amount) {
  const moneyFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  });
  return moneyFormatter.format(amount);
}

function shortenMoney(amount, fixed = 0) {
  if (!amount) return "?";
  const units = ["", "K", "M", "B"];
  let unitIndex = 0;
  while (amount >= 1000 && unitIndex < units.length - 1) {
    amount /= 1000;
    unitIndex++;
  }
  return `${amount.toFixed(fixed)}${units[unitIndex]}`;
}

function generateSummary(transactions) {
  const summaryDiv = document.querySelector("#summary");
  const total = transactions.reduce((sum, t) => sum + parseInt(t.money), 0);
  const average = total / transactions.length;
  let max = 0,
    min = Infinity;
  transactions.forEach((t) => {
    if (parseInt(t.money) > max) max = t.money;
    if (parseInt(t.money) < min) min = t.money;
  });

  const summaryData = [
    [
      "Tổng số lượt giao dịch:",
      `<strong>${formatNumber(transactions.length)}</strong>`,
    ],
    ["Tổng số tiền ủng hộ:", `<strong>${formatMoney(total)}</strong>`],
    [
      "Số tiền trung bình/lượt giao dịch:",
      `<strong>${formatMoney(average)}</strong>`,
    ],
    ["Số tiền cao nhất:", `<strong>${formatMoney(max)}</strong>`],
    ["Số tiền thấp nhất:", `<strong>${formatMoney(min)}</strong>`],
  ];

  summaryDiv.innerHTML = `
    <table>
      ${summaryData
        .map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`)
        .join("")}
    </table>
  `;

  const ranges = [
    [1000, 10000],
    [10000, 20000],
    [20000, 50000],
    [50000, 100000],
    [100000, 200000],
    [200000, 500000],
    [500000, 1000000],
    [1000000, 5000000],
    [5000000, 10000000],
    [10000000, 50000000],
    [50000000, 100000000],
    [100000000, 500000000],
    [500000000, 1000000000],
    [1000000000, 2000000000],
    [2000000000, 5000000000],
  ];

  const dataset = ranges.map(([min, max]) => ({
    count: transactions.filter((t) => t.money >= min && t.money < max).length,
    name: `${shortenMoney(min)} - ${shortenMoney(max)}`,
  }));

  createChart(summaryDiv, dataset);
}

function createChart(container, data) {
  const canvas = document.createElement("canvas");
  canvas.id = "chart";
  const ctx = canvas.getContext("2d");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((item) => item.name),
      datasets: [
        {
          label: "Số lượt giao dịch",
          data: data.map((item) => item.count),
        },
      ],
    },
  });

  container.appendChild(canvas);
}
