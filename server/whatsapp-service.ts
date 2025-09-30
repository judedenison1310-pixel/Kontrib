interface MetaWhatsAppResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
    message_status?: string;
  }>;
}

interface MetaWhatsAppError {
  error: {
    message: string;
    type: string;
    code: number;
    error_data?: {
      messaging_product: string;
      details: string;
    };
    error_subcode?: number;
    fbtrace_id: string;
  };
}

class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private apiVersion: string = "v21.0";
  private baseUrl: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;

    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error("Missing required Meta WhatsApp API credentials");
    }

    console.log("Meta WhatsApp Cloud API Service initialized:", {
      phoneNumberId: this.phoneNumberId,
      apiVersion: this.apiVersion,
      baseUrl: this.baseUrl
    });
  }

  async sendOTP(phoneNumber: string, otpCode: string): Promise<boolean> {
    try {
      const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, "");
      
      const isDevelopment = process.env.NODE_ENV === "development";
      
      if (isDevelopment) {
        console.log(`Sending OTP via Meta WhatsApp to: ${cleanPhoneNumber}`);
      } else {
        console.log(`Sending OTP via Meta WhatsApp to: ${cleanPhoneNumber.substring(0, 3)}***${cleanPhoneNumber.substring(cleanPhoneNumber.length - 3)}`);
      }
      
      const payload = {
        messaging_product: "whatsapp",
        to: cleanPhoneNumber,
        type: "template",
        template: {
          name: "kontrib_otp",
          language: {
            code: "en"
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: otpCode
                }
              ]
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [
                {
                  type: "text",
                  text: otpCode
                }
              ]
            }
          ]
        }
      };

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json() as MetaWhatsAppResponse | MetaWhatsAppError;

      if (!response.ok) {
        const error = result as MetaWhatsAppError;
        
        if (isDevelopment) {
          console.error("Meta WhatsApp API Error (Development):", {
            status: response.status,
            error_code: error.error.code,
            error_message: error.error.message,
            error_type: error.error.type,
            details: error.error.error_data?.details,
            to: cleanPhoneNumber
          });
        } else {
          console.error("Meta WhatsApp API Error (Production):", {
            status: response.status,
            error_code: error.error.code,
            error_message: error.error.message,
            timestamp: new Date().toISOString(),
            to_masked: cleanPhoneNumber.substring(0, 3) + "***" + cleanPhoneNumber.substring(cleanPhoneNumber.length - 3)
          });
        }
        
        return false;
      }

      const successResult = result as MetaWhatsAppResponse;
      
      if (isDevelopment) {
        console.log("Meta WhatsApp OTP sent successfully (Development):", {
          messageId: successResult.messages[0].id,
          status: successResult.messages[0].message_status || "sent",
          to: phoneNumber,
          waId: successResult.contacts[0].wa_id
        });
      } else {
        console.log("Meta WhatsApp OTP sent successfully (Production):", {
          messageId: successResult.messages[0].id,
          status: successResult.messages[0].message_status || "sent",
          timestamp: new Date().toISOString(),
          to_masked: cleanPhoneNumber.substring(0, 3) + "***" + cleanPhoneNumber.substring(cleanPhoneNumber.length - 3)
        });
      }
      
      return true;
    } catch (error) {
      console.error("Meta WhatsApp service error:", error);
      return false;
    }
  }

  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, "");
      
      const isDevelopment = process.env.NODE_ENV === "development";
      
      if (isDevelopment) {
        console.log(`Sending message via Meta WhatsApp to: ${cleanPhoneNumber}`);
      }
      
      const payload = {
        messaging_product: "whatsapp",
        to: cleanPhoneNumber,
        type: "text",
        text: {
          body: message
        }
      };

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json() as MetaWhatsAppResponse | MetaWhatsAppError;

      if (!response.ok) {
        const error = result as MetaWhatsAppError;
        console.error("Meta WhatsApp API Error:", {
          status: response.status,
          error_code: error.error.code,
          error_message: error.error.message,
          error_type: error.error.type
        });
        return false;
      }

      const successResult = result as MetaWhatsAppResponse;
      
      if (isDevelopment) {
        console.log("Meta WhatsApp message sent successfully:", {
          messageId: successResult.messages[0].id,
          to: phoneNumber,
          waId: successResult.contacts[0].wa_id
        });
      }
      
      return true;
    } catch (error) {
      console.error("Meta WhatsApp service error:", error);
      return false;
    }
  }

  isValidWhatsAppNumber(phoneNumber: string): boolean {
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, "");
    return /^\+[1-9]\d{1,14}$/.test(cleanNumber);
  }
}

export const whatsappService = new WhatsAppService();
