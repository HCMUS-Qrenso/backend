export const EMAIL_TEMPLATES = {
  verification: {
    subject: 'Verify Your Email Address - Qrenso',
    getHtml: (fullName: string, verificationUrl: string) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Qrenso</h1>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #333333; margin: 0 0 20px; font-size: 24px;">Welcome, ${fullName}! 🎉</h2>
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Thank you for registering with Qrenso. We're excited to have you on board!
                      </p>
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        Please verify your email address by clicking the button below:
                      </p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: #ffffff; 
                                  padding: 14px 40px; 
                                  text-decoration: none; 
                                  border-radius: 6px; 
                                  font-size: 16px; 
                                  font-weight: bold;
                                  display: inline-block;
                                  box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                          Verify Email Address
                        </a>
                      </div>
                      <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                        <strong>Note:</strong> This link will expire in 24 hours.
                      </p>
                      <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 10px 0 0;">
                        If you didn't create this account, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 14px; margin: 0;">
                        © ${new Date().getFullYear()} Qrenso. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  },

  passwordReset: {
    subject: 'Reset Your Password - Qrenso',
    getHtml: (fullName: string, resetUrl: string) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🔐 Password Reset</h1>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #333333; margin: 0 0 20px; font-size: 24px;">Hi ${fullName},</h2>
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        We received a request to reset your password for your Qrenso account.
                      </p>
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        Click the button below to create a new password:
                      </p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
                                  color: #ffffff; 
                                  padding: 14px 40px; 
                                  text-decoration: none; 
                                  border-radius: 6px; 
                                  font-size: 16px; 
                                  font-weight: bold;
                                  display: inline-block;
                                  box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                          Reset Password
                        </a>
                      </div>
                      <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                        <strong>Note:</strong> This link will expire in 1 hour for security reasons.
                      </p>
                      <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 10px 0 0;">
                        If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 14px; margin: 0;">
                        © ${new Date().getFullYear()} Qrenso. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  },

  welcome: {
    subject: 'Welcome to Qrenso! 🎊',
    getHtml: (fullName: string) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Qrenso</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎉 Welcome Aboard!</h1>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #333333; margin: 0 0 20px; font-size: 24px;">Hi ${fullName},</h2>
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Your account has been successfully verified! 🎊
                      </p>
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        You're all set to explore and enjoy all the features Qrenso has to offer.
                      </p>
                      <div style="background-color: #f8f9fa; border-left: 4px solid #4facfe; padding: 20px; margin: 30px 0;">
                        <h3 style="color: #333333; margin: 0 0 15px; font-size: 18px;">What's Next?</h3>
                        <ul style="color: #666666; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                          <li>Browse our restaurant menu</li>
                          <li>Scan QR codes for table ordering</li>
                          <li>Track your orders in real-time</li>
                          <li>Leave reviews and ratings</li>
                        </ul>
                      </div>
                      <div style="text-align: center; margin: 30px 0;">
                        <p style="color: #999999; font-size: 14px; margin: 0;">
                          Need help? Our support team is here for you!
                        </p>
                      </div>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 14px; margin: 0;">
                        © ${new Date().getFullYear()} Qrenso. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  },

  staffInvite: {
    subject: "You're Invited to Join Qrenso! 🎉",
    getHtml: (fullName: string, setupUrl: string, restaurantName?: string) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're Invited!</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎉 You're Invited!</h1>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #333333; margin: 0 0 20px; font-size: 24px;">Hi ${fullName},</h2>
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        You have been invited to join ${restaurantName ? `<strong>${restaurantName}</strong> on ` : ''}Qrenso as a staff member.
                      </p>
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        Click the button below to set up your password and activate your account:
                      </p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${setupUrl}" 
                           style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); 
                                  color: #ffffff; 
                                  padding: 14px 40px; 
                                  text-decoration: none; 
                                  border-radius: 6px; 
                                  font-size: 16px; 
                                  font-weight: bold;
                                  display: inline-block;
                                  box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                          Set Up My Password
                        </a>
                      </div>
                      <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                        <strong>Note:</strong> This link will expire in 24 hours for security reasons.
                      </p>
                      <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 10px 0 0;">
                        If you weren't expecting this invitation, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 14px; margin: 0;">
                        © ${new Date().getFullYear()} Qrenso. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  },
};
