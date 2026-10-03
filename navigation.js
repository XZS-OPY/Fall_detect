// ============================================================
//  导航模块
// ============================================================

const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");

function initNavigation() {
    navButtons.forEach(button => {
        button.addEventListener("click", function() {
            const target = this.dataset.view;
            if (!target) return;

            navButtons.forEach(item => item.classList.remove("active"));
            views.forEach(view => view.classList.remove("active"));

            this.classList.add("active");
            const targetView = document.getElementById(target);
            if (targetView) targetView.classList.add("active");
        });
    });
}