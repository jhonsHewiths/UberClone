export function getOptionalCheckoutRedirects({ publicUrl, webhookSecret, returnUrl }) {
  const configuration = {};
  if (returnUrl) {
    let parsedReturnUrl;
    try {
      parsedReturnUrl = new URL(returnUrl);
    } catch {
      throw new Error('La URL de retorno de Mercado Pago no es válida.');
    }

    const isAppDeepLink = (
      (parsedReturnUrl.protocol === 'uberclone:' && parsedReturnUrl.hostname === 'payment-return')
      || (
        parsedReturnUrl.protocol === 'exp:'
        && parsedReturnUrl.pathname.endsWith('/payment-return')
      )
    );
    if (!isAppDeepLink) {
      throw new Error('La URL de retorno debe ser el enlace profundo de UberClone.');
    }

    configuration.back_urls = {
      success: returnUrl,
      failure: returnUrl,
      pending: returnUrl,
    };
    configuration.auto_return = 'approved';
  } else if (publicUrl) {
    if (!publicUrl.startsWith('https://')) {
      throw new Error('PAYMENT_API_PUBLIC_URL debe ser una URL HTTPS pública para Mercado Pago.');
    }
    configuration.back_urls = {
      success: `${publicUrl}/api/payments/return?status=success`,
      failure: `${publicUrl}/api/payments/return?status=failure`,
      pending: `${publicUrl}/api/payments/return?status=pending`,
    };
    configuration.auto_return = 'approved';
  }

  if (webhookSecret) {
    if (!publicUrl?.startsWith('https://')) {
      throw new Error('PAYMENT_API_PUBLIC_URL es obligatorio para activar el webhook.');
    }
    configuration.notification_url = `${publicUrl}/api/payments/webhook`;
  }

  return configuration;
}
