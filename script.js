/*
  Internet Café Management System
  Design patterns demonstrated in plain JavaScript:
  1. Singleton: CafeManager
  2. Factory Method: ServiceFactory
  3. Observer: ComputerStatus subject + subscribers
  4. Strategy: Hourly/Student/Member pricing strategies
  5. Command: StartSessionCommand and EndSessionCommand
*/

const money = amount => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0
}).format(amount);

// 1. Singleton Pattern
class CafeManager {
  constructor(secret) {
    if (CafeManager.instance) return CafeManager.instance;
    if (secret !== "create-cafe") throw new Error("Use CafeManager.getInstance()");
    this.computers = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      name: `PC-${String(i + 1).padStart(2, "0")}`,
      status: i < 3 ? "busy" : "available",
      customer: i < 3 ? ["Aarav", "Priya", "Rahul"][i] : ""
    }));
    this.sessions = this.computers.filter(pc => pc.status === "busy").map((pc, i) => ({
      id: `demo-${i + 1}`,
      customer: pc.customer,
      computerId: pc.id,
      plan: "hourly",
      duration: 1,
      amount: 40
    }));
    this.history = [];
    CafeManager.instance = this;
  }
  static getInstance() {
    if (!CafeManager.instance) new CafeManager("create-cafe");
    return CafeManager.instance;
  }
}
const cafe = CafeManager.getInstance();

// 3. Observer Pattern
class ComputerStatus {
  constructor() { this.observers = []; }
  subscribe(observer) { this.observers.push(observer); }
  notify(computer) { this.observers.forEach(observer => observer(computer)); }
  setStatus(computer, status, customer = "") {
    computer.status = status;
    computer.customer = customer;
    this.notify(computer);
  }
}
const computerStatus = new ComputerStatus();
computerStatus.subscribe(() => renderComputers());
computerStatus.subscribe(() => renderStats());

// 4. Strategy Pattern
class HourlyPayment {
  calculate(hours) { return hours * 40; }
}
class StudentPayment {
  calculate(hours) { return hours * 30; }
}
class MemberPayment {
  calculate(hours) { return hours * 25; }
}
const paymentStrategies = {
  hourly: new HourlyPayment(),
  student: new StudentPayment(),
  member: new MemberPayment()
};
const planNames = { hourly: "Hourly", student: "Student", member: "Member" };

// 2. Factory Method Pattern
class CafeService {
  constructor(name, unitPrice) {
    this.name = name;
    this.unitPrice = unitPrice;
  }
  getTotal(quantity) { return this.unitPrice * quantity; }
}
class ServiceFactory {
  static create(type) {
    const services = {
      "Printing": () => new CafeService("Printing", 5),
      "Scanning": () => new CafeService("Scanning", 10),
      "Photocopy": () => new CafeService("Photocopy", 2),
      "Online form": () => new CafeService("Online form assistance", 50)
    };
    if (!services[type]) throw new Error("Unknown service");
    return services[type]();
  }
}

// 5. Command Pattern
class StartSessionCommand {
  constructor(manager, computer, customer, plan, duration) {
    Object.assign(this, { manager, computer, customer, plan, duration });
  }
  execute() {
    if (this.computer.status !== "available") throw new Error("That computer is not available.");
    const session = {
      id: `session-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customer: this.customer,
      computerId: this.computer.id,
      plan: this.plan,
      duration: this.duration,
      amount: paymentStrategies[this.plan].calculate(this.duration)
    };
    this.manager.sessions.push(session);
    computerStatus.setStatus(this.computer, "busy", this.customer);
    return session;
  }
}
class EndSessionCommand {
  constructor(manager, session) { this.manager = manager; this.session = session; }
  execute() {
    const index = this.manager.sessions.findIndex(s => s.id === this.session.id);
    if (index === -1) throw new Error("Session not found.");
    const [session] = this.manager.sessions.splice(index, 1);
    const computer = this.manager.computers.find(pc => pc.id === session.computerId);
    computerStatus.setStatus(computer, "available", "");
    this.manager.history.unshift({
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      customer: session.customer,
      details: `${computer.name} · ${planNames[session.plan]} plan (${session.duration}h)`,
      amount: session.amount
    });
    return session;
  }
}

const $ = id => document.getElementById(id);
function renderComputers() {
  $("computerGrid").innerHTML = cafe.computers.map(pc => `
    <article class="computer-card">
      <div class="computer-top"><span class="computer-icon">▣</span>
        <span class="status-label ${pc.status}">${pc.status === "busy" ? "In use" : pc.status[0].toUpperCase() + pc.status.slice(1)}</span>
      </div>
      <strong>${pc.name}</strong>
      <p>${pc.status === "busy" ? `Customer: ${escapeHtml(pc.customer)}` : pc.status === "offline" ? "Needs attention" : "Ready for use"}</p>
    </article>`).join("");
  renderComputerOptions();
}
function renderComputerOptions() {
  const select = $("computerSelect");
  const previous = select.value;
  const available = cafe.computers.filter(pc => pc.status === "available");
  select.innerHTML = available.length
    ? available.map(pc => `<option value="${pc.id}">${pc.name}</option>`).join("")
    : `<option value="">No computers available</option>`;
  if (available.some(pc => String(pc.id) === previous)) select.value = previous;
  select.disabled = available.length === 0;
}
function renderStats() {
  $("totalComputers").textContent = cafe.computers.length;
  $("availableComputers").textContent = cafe.computers.filter(pc => pc.status === "available").length;
  $("activeSessions").textContent = cafe.sessions.length;
  const sessionRevenue = cafe.history.reduce((sum, item) => sum + item.amount, 0);
  $("revenue").textContent = money(sessionRevenue);
}
function renderSessions() {
  $("sessionTable").innerHTML = cafe.sessions.map(session => {
    const pc = cafe.computers.find(item => item.id === session.computerId);
    return `<tr>
      <td>${escapeHtml(session.customer)}</td><td>${pc.name}</td>
      <td>${planNames[session.plan]}</td><td>${session.duration} hour(s)</td>
      <td><strong>${money(session.amount)}</strong></td>
      <td><button class="end-button" data-end="${session.id}">End session</button></td>
    </tr>`;
  }).join("");
  $("emptySessions").hidden = cafe.sessions.length > 0;
  $("activePill").textContent = `${cafe.sessions.length} active`;
}
function renderHistory() {
  $("historyTable").innerHTML = cafe.history.map(item => `<tr>
    <td>${item.time}</td><td>${escapeHtml(item.customer)}</td><td>${escapeHtml(item.details)}</td><td><strong>${money(item.amount)}</strong></td>
  </tr>`).join("");
  $("emptyHistory").hidden = cafe.history.length > 0;
}
function renderAll() {
  renderComputers();
  renderStats();
  renderSessions();
  renderHistory();
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

$("sessionForm").addEventListener("submit", event => {
  event.preventDefault();
  const customer = $("customerName").value.trim();
  const computer = cafe.computers.find(pc => pc.id === Number($("computerSelect").value));
  const plan = $("planSelect").value;
  const duration = Number($("durationSelect").value);
  if (!customer || !computer) {
    $("sessionMessage").textContent = "Enter a customer name and select an available computer.";
    return;
  }
  try {
    const command = new StartSessionCommand(cafe, computer, customer, plan, duration);
    const session = command.execute();
    $("sessionMessage").textContent = `Session started for ${customer}. Estimated bill: ${money(session.amount)}.`;
    $("sessionForm").reset();
  } catch (error) {
    $("sessionMessage").textContent = error.message;
  }
  renderAll();
});

$("sessionTable").addEventListener("click", event => {
  const button = event.target.closest("[data-end]");
  if (!button) return;
  const session = cafe.sessions.find(item => item.id === button.dataset.end);
  if (!session) return;
  new EndSessionCommand(cafe, session).execute();
  $("sessionMessage").textContent = `Session ended for ${session.customer}. Bill added to history.`;
  renderAll();
});

$("serviceForm").addEventListener("submit", event => {
  event.preventDefault();
  const customer = $("serviceCustomer").value.trim();
  const type = $("serviceType").value;
  const quantity = Number($("serviceQuantity").value);
  if (!customer || !Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
    $("serviceMessage").textContent = "Enter a customer name and a quantity from 1 to 500.";
    return;
  }
  const service = ServiceFactory.create(type);
  const amount = service.getTotal(quantity);
  cafe.history.unshift({
    time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    customer,
    details: `${service.name} × ${quantity}`,
    amount
  });
  $("serviceMessage").textContent = `${service.name} added for ${customer}: ${money(amount)}.`;
  $("serviceForm").reset();
  $("serviceQuantity").value = 1;
  renderHistory();
  renderStats();
});

$("clearHistory").addEventListener("click", () => {
  if (!cafe.history.length) return;
  if (confirm("Clear all billing history?")) {
    cafe.history = [];
    renderHistory();
    renderStats();
  }
});

renderAll();
