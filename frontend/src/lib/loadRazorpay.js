// Loads Razorpay checkout.js only when a payment is started, instead of on every page.
let promRazorpay = null;

export default function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!promRazorpay) {
    promRazorpay = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => {
        promRazorpay = null;
        reject(new Error("Failed to load Razorpay checkout"));
      };
      document.body.appendChild(script);
    });
  }
  return promRazorpay;
}
