import { MealType } from "./models.js";
import { getMenu } from "./storage.js";
import { findStudent } from "./student.js";
import { cancelMeal, getBookingForDate } from "./meal.js";
import { getRangeMealsReport } from "./billing.js";
import {
  qs,
  formatCurrency,
  capitalize,
  parseDateInputValue,
  addDays,
  getSelectedBookingDate
} from "./utils.js";

function renderBookingHistoryForRoll(_roll) {}

export function renderTodayMenu() {
  const menuDiv = qs("#today-menu");
  const menu = getMenu();
  menuDiv.innerHTML = `
    <div><strong>Breakfast:</strong> ${(menu.breakfast || "").toUpperCase()}</div>
    <div><strong>Lunch:</strong> ${(menu.lunch || "").toUpperCase()}</div>
    <div><strong>Dinner:</strong> ${(menu.dinner || "").toUpperCase()}</div>
  `;
}

export function updateBookingStatus() {
  const roll = qs("#stu-roll").value.trim();
  const statusDiv = qs("#booking-status");
  if (!roll) {
    statusDiv.textContent = "Enter roll & load profile.";
    return;
  }
  const date = getSelectedBookingDate();
  const booking = getBookingForDate(roll, date);
  if (!booking) {
    statusDiv.innerHTML = `<span class="badge badge-warning">No meals booked for this date.</span>`;
    return;
  }
  const statuses = [
    ["BREAKFAST", booking.breakfast],
    ["LUNCH", booking.lunch],
    ["DINNER", booking.dinner]
  ]
    .map(
      ([label, booked]) =>
        `<span class="badge ${booked ? "badge-success" : ""}">
          ${label}: ${booked ? "Booked" : "Not booked"}
        </span>`
    )
    .join(" ");
  statusDiv.innerHTML = statuses;
}

export function handleBookingAction(action, mealType) {
  const roll = qs("#stu-roll").value.trim();
  const msg = qs("#booking-message");
  msg.style.color = "#6b7280";
  msg.textContent = "";
  if (!roll) {
    msg.textContent = "Please enter your roll number first.";
    msg.style.color = "#b91c1c";
    return;
  }
  const date = getSelectedBookingDate();
  const result =
    action === "book"
      ? bookMeal(roll, mealType, date)
      : cancelMeal(roll, mealType, date);
  if (result instanceof Error) {
    msg.textContent = result.message || "Something went wrong.";
    msg.style.color = "#b91c1c";
  } else {
    if (result.ok) {
      msg.textContent =
        result.message ||
        (action === "book"
          ? "Meal booked successfully."
          : "Meal cancelled successfully.");
      msg.style.color = "#15803d";
    } else {
      msg.textContent =
        result.message ||
        (action === "cancel"
          ? "You can no longer cancel this meal."
          : "Action could not be completed.");
      msg.style.color = "#b91c1c";
    }
  }
  updateBookingStatus();
  renderBookingHistoryForRoll(roll);
}

export function initBulkBooking() {
  const bulkMsg = qs("#bulk-message");
  function doBulk(action) {
    const roll = qs("#stu-roll").value.trim();
    if (!roll) {
      bulkMsg.textContent = "Load profile with roll number first.";
      bulkMsg.style.color = "#b91c1c";
      return;
    }
    const startStr = qs("#bulk-start").value;
    const days = Number(qs("#bulk-days").value || 0);
    if (!startStr || days <= 0) {
      bulkMsg.textContent = "Enter a valid start date and number of days.";
      bulkMsg.style.color = "#b91c1c";
      return;
    }
    const bf = qs("#bulk-bf").checked;
    const ln = qs("#bulk-lunch").checked;
    const dn = qs("#bulk-dinner").checked;
    if (!bf && !ln && !dn) {
      bulkMsg.textContent = "Select at least one meal.";
      bulkMsg.style.color = "#b91c1c";
      return;
    }
    const startDate = parseDateInputValue(startStr);
    let successCount = 0;
    for (let i = 0; i < days; i++) {
      const d = addDays(startDate, i);
      if (bf) {
        action === "book"
          ? bookMeal(roll, MealType.Breakfast, d)
          : cancelMeal(roll, MealType.Breakfast, d);
      }
      if (ln) {
        action === "book"
          ? bookMeal(roll, MealType.Lunch, d)
          : cancelMeal(roll, MealType.Lunch, d);
      }
      if (dn) {
        action === "book"
          ? bookMeal(roll, MealType.Dinner, d)
          : cancelMeal(roll, MealType.Dinner, d);
      }
      successCount++;
    }
    bulkMsg.textContent =
      successCount +
      " days " +
      (action === "book" ? "booked." : "cancelled.");
    bulkMsg.style.color = "#15803d";
    updateBookingStatus();
  }
  qs("#btn-bulk-book").addEventListener("click", () => doBulk("book"));
  qs("#btn-bulk-cancel").addEventListener("click", () => doBulk("cancel"));
}

export function initStudentPanel() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  qs("#today-label").textContent = today.toLocaleDateString();
  const dateInput = qs("#booking-date");

  if (dateInput) {
    dateInput.value = todayStr;
    dateInput.addEventListener("change", updateBookingStatus);
  }

  const bulkStart = qs("#bulk-start");
  if (bulkStart) bulkStart.value = todayStr;

  renderTodayMenu();

  const rollInput = qs("#stu-roll");
  const msg = qs("#stu-message");
  const profileDiv = qs("#stu-profile-content");
  const balanceBadge = qs("#stu-balance-badge");

  function loadStudentProfile() {
    const roll = rollInput.value.trim();
    if (!roll) {
      msg.textContent = "Enter roll number.";
      profileDiv.textContent = "No profile loaded.";
      balanceBadge.textContent = "";
      renderBookingHistoryForRoll(null);
      return;
    }

    const student = findStudent(roll);
    if (!student) {
      msg.textContent = "Student not found.";
      profileDiv.textContent = "No profile loaded.";
      balanceBadge.textContent = "";
      renderBookingHistoryForRoll(null);
      return;
    }

    msg.textContent = "";
    profileDiv.innerHTML = `
      <div><strong>${student.name}</strong> (${student.rollNo})</div>
      <div>Room: ${student.roomNumber}</div>
    `;
    balanceBadge.textContent = `Remaining Balance: ${formatCurrency(
      student.currentBalance
    )}`;
    updateBookingStatus();
    renderBookingHistoryForRoll(roll);
  }

  qs("#btn-stu-load").addEventListener("click", loadStudentProfile);
  rollInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loadStudentProfile();
  });

  document.querySelectorAll("[data-book]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = capitalize(btn.dataset.book);
      handleBookingAction("book", MealType[key]);
    });
  });

  document.querySelectorAll("[data-cancel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = capitalize(btn.dataset.cancel);
      handleBookingAction("cancel", MealType[key]);
    });
  });

  initBulkBooking();
}

export function initStudentBillSummary() {
  const btn = qs("#btn-stu-bill");
  const fromInput = qs("#stu-bill-from");
  const toInput = qs("#stu-bill-to");
  const resultDiv = qs("#stu-bill-result");
  if (!btn || !fromInput || !toInput || !resultDiv) return;

  const today = new Date();
  fromInput.value = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  toInput.value = today.toISOString().slice(0, 10);

  btn.addEventListener("click", () => {
    const roll = qs("#stu-roll").value.trim();
    resultDiv.style.color = "#374151";

    if (!roll) {
      resultDiv.textContent = "Load your profile with roll number first.";
      resultDiv.style.color = "#b91c1c";
      return;
    }

    const from = parseDateInputValue(fromInput.value);
    const to = parseDateInputValue(toInput.value);

    try {
      const report = getRangeMealsReport(from, to);
      const stu = report?.byStudent?.find((s) => s.rollNo === roll);

      if (!stu) {
        resultDiv.textContent = "No meals found in this date range.";
        resultDiv.style.color = "#b91c1c";
        return;
      }

      resultDiv.innerHTML = `
        <div style="margin-bottom:10px;">
          <strong>Bill for:</strong> ${stu.name} (${stu.rollNo})
        </div>
        <table class="billing-table">
          <tr><td>BREAKFAST</td><td>${stu.breakfast || 0}</td></tr>
          <tr><td>LUNCH</td><td>${stu.lunch || 0}</td></tr>
          <tr><td>DINNER</td><td>${stu.dinner || 0}</td></tr>
        </table>
        <div style="margin-top:12px;">
          <strong>Total Amount:</strong> ${formatCurrency(stu.total || 0)}
        </div>
      `;
    } catch (e) {
      resultDiv.textContent = "Could not calculate bill.";
      resultDiv.style.color = "#b91c1c";
    }
  });
}
