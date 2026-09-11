import { renderNav, renderFooter } from '../components/nav.js';
import { qs } from '../utils/dom.js';

renderNav();
renderFooter();

function init() {
  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason');
  const orderId = params.get('orderId');

  qs('#failed-reason').textContent = reason || 'Something went wrong while processing your payment. Please try again.';

  if (orderId) {
    const retryLink = qs('#retry-payment-link');
    retryLink.href = `/payment?orderId=${encodeURIComponent(orderId)}`;
    retryLink.classList.remove('hidden');
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

init();
