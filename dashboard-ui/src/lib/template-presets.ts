// Predefined email template designs for the Unlayer editor
// Each template has a name, thumbnail description, category, and the Unlayer JSON design

export interface PresetTemplate {
  id: string
  name: string
  description: string
  category: "welcome" | "newsletter" | "promotion" | "notification" | "minimal"
  thumbnail: string // emoji for simple visual
  design: Record<string, unknown>
}

// Shared style constants
const brandColors = {
  watpak: { primary: "#FFC107", dark: "#FFB300", text: "#1a1a1a" },
  dercolbags: { primary: "#1a1a1a", dark: "#000000", text: "#ffffff" },
}

export const presetTemplates: PresetTemplate[] = [
  {
    id: "blank",
    name: "Blank Canvas",
    description: "Start from scratch with an empty template",
    category: "minimal",
    thumbnail: "01",
    design: {
      counters: { u_row: 2, u_column: 2, u_content_text: 2 },
      body: {
        id: "body",
        rows: [
          {
            id: "row-blank-1",
            cells: [1],
            columns: [
              {
                id: "col-blank-1",
                contents: [
                  {
                    id: "content-blank-1",
                    type: "text",
                    values: {
                      containerPadding: "40px",
                      textAlign: "center",
                      lineHeight: "160%",
                      _meta: { htmlID: "u_content_text_1", htmlClassNames: "u_content_text" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<p style="font-size: 32px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: -1px;">Your Email Title</p><p style="font-size: 16px; color: #000000;">&nbsp;</p><p style="font-size: 16px; color: #000000; font-weight: 500;">Start building your email by dragging blocks from the left panel. Click any element to edit it.</p>',
                    },
                  },
                ],
                values: {
                  backgroundColor: "#ffffff",
                  padding: "0px",
                  _meta: { htmlID: "u_column_1", htmlClassNames: "u_column" },
                },
              },
            ],
            values: {
              padding: "20px 10px",
              _meta: { htmlID: "u_row_1", htmlClassNames: "u_row" },
              selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
            },
          },
        ],
        values: {
          backgroundColor: "#f4f4f5",
          width: "600px",
          fontFamily: { label: "Arial", value: "arial,helvetica,sans-serif" },
          contentWidth: "600px",
          contentAlign: "center",
          preheaderText: "",
          linkStyle: {
            body: true,
            linkColor: "#000000",
            linkHoverColor: "#000000",
            linkUnderline: true,
            linkHoverUnderline: true,
          },
          _meta: { htmlID: "u_body", htmlClassNames: "u_body" },
        },
      },
      schemaVersion: 16,
    },
  },
  {
    id: "welcome-email",
    name: "Welcome Email",
    description: "A warm welcome email for new subscribers",
    category: "welcome",
    thumbnail: "02",
    design: {
      counters: { u_row: 4, u_column: 4, u_content_text: 4, u_content_button: 1, u_content_image: 1, u_content_divider: 1 },
      body: {
        id: "body",
        rows: [
          {
            id: "row-1",
            cells: [1],
            columns: [
              {
                id: "col-1",
                contents: [
                  {
                    id: "content-1",
                    type: "text",
                    values: {
                      containerPadding: "30px 40px 10px",
                      anchor: "",
                      textAlign: "center",
                      lineHeight: "120%",
                      linkStyle: { inherit: true },
                      hideDesktop: false,
                      displayCondition: null,
                      _meta: { htmlID: "u_content_text_1", htmlClassNames: "u_content_text" },
                      selectable: true,
                      draggable: true,
                      duplicatable: true,
                      deletable: true,
                      hideable: true,
                      text: '<p style="font-size: 36px; font-weight: 900; color: #000000; text-transform: uppercase;">WELCOME TO {{brandName}}</p>',
                    },
                  },
                ],
                values: {
                  backgroundColor: "#ffffff",
                  padding: "0px",
                  _meta: { htmlID: "u_column_1", htmlClassNames: "u_column" },
                },
              },
            ],
            values: {
              displayCondition: null,
              columns: false,
              backgroundColor: "",
              columnsBackgroundColor: "",
              backgroundImage: { url: "", fullWidth: true, repeat: "no-repeat", size: "custom", position: "center" },
              padding: "20px 10px 0px",
              anchor: "",
              hideDesktop: false,
              _meta: { htmlID: "u_row_1", htmlClassNames: "u_row" },
              selectable: true,
              draggable: true,
              duplicatable: true,
              deletable: true,
              hideable: true,
            },
          },
          {
            id: "row-2",
            cells: [1],
            columns: [
              {
                id: "col-2",
                contents: [
                  {
                    id: "content-2",
                    type: "text",
                    values: {
                      containerPadding: "10px 40px 20px",
                      textAlign: "center",
                      lineHeight: "160%",
                      linkStyle: { inherit: true },
                      hideDesktop: false,
                      _meta: { htmlID: "u_content_text_2", htmlClassNames: "u_content_text" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<p style="font-size: 16px; color: #000000; font-weight: 500;">Hi {{name}},</p><p style="font-size: 16px; color: #000000;">&nbsp;</p><p style="font-size: 16px; color: #000000; font-weight: 500;">Thank you for subscribing to our newsletter! We\'re excited to have you on board. You\'ll be the first to know about our latest products, exclusive offers, and industry insights.</p>',
                    },
                  },
                ],
                values: {
                  backgroundColor: "#ffffff",
                  padding: "0px",
                  _meta: { htmlID: "u_column_2", htmlClassNames: "u_column" },
                },
              },
            ],
            values: {
              padding: "0px 10px",
              _meta: { htmlID: "u_row_2", htmlClassNames: "u_row" },
              selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
            },
          },
          {
            id: "row-3",
            cells: [1],
            columns: [
              {
                id: "col-3",
                contents: [
                  {
                    id: "content-btn",
                    type: "button",
                    values: {
                      containerPadding: "10px 40px 30px",
                      anchor: "",
                      href: { name: "web", values: { href: "{{dashboardUrl}}", target: "_blank" } },
                      buttonColors: { color: "#ffffff", backgroundColor: "#000000", hoverColor: "#ffffff", hoverBackgroundColor: "#333333" },
                      size: { autoWidth: false, width: "100%" },
                      textAlign: "center",
                      lineHeight: "120%",
                      padding: "16px 30px",
                      hideDesktop: false,
                      _meta: { htmlID: "u_content_button_1", htmlClassNames: "u_content_button" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<span style="font-size: 18px; font-weight: 800; text-transform: uppercase;">Explore Our Products</span>',
                      calculatedWidth: 520,
                      calculatedHeight: 45,
                    },
                  },
                ],
                values: {
                  backgroundColor: "#ffffff",
                  padding: "0px",
                  _meta: { htmlID: "u_column_3", htmlClassNames: "u_column" },
                },
              },
            ],
            values: {
              padding: "0px 10px",
              _meta: { htmlID: "u_row_3", htmlClassNames: "u_row" },
              selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
            },
          },
          {
            id: "row-4",
            cells: [1],
            columns: [
              {
                id: "col-4",
                contents: [
                  {
                    id: "content-footer",
                    type: "text",
                    values: {
                      containerPadding: "20px 40px",
                      textAlign: "center",
                      lineHeight: "160%",
                      _meta: { htmlID: "u_content_text_4", htmlClassNames: "u_content_text" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<p style="font-size: 12px; color: #666666; font-weight: 600;">You received this email because you subscribed to {{brandName}}.</p><p style="font-size: 12px; color: #666666;"><a href="{{unsubscribeUrl}}" style="color: #666666;">Unsubscribe</a></p>',
                    },
                  },
                ],
                values: {
                  backgroundColor: "",
                  padding: "0px",
                  _meta: { htmlID: "u_column_4", htmlClassNames: "u_column" },
                },
              },
            ],
            values: {
              padding: "10px",
              _meta: { htmlID: "u_row_4", htmlClassNames: "u_row" },
              selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
            },
          },
        ],
        values: {
          backgroundColor: "#f4f4f5",
          width: "600px",
          fontFamily: { label: "Arial", value: "arial,helvetica,sans-serif" },
          contentWidth: "600px",
          contentAlign: "center",
          preheaderText: "Welcome aboard!",
          linkStyle: { body: true, linkColor: "#000000", linkHoverColor: "#333333", linkUnderline: true, linkHoverUnderline: true },
          _meta: { htmlID: "u_body", htmlClassNames: "u_body" },
        },
      },
      schemaVersion: 16,
    },
  },
  {
    id: "product-announcement",
    name: "Product Announcement",
    description: "Announce a new product or feature with a hero image",
    category: "newsletter",
    thumbnail: "03",
    design: {
      counters: { u_row: 3, u_column: 3, u_content_text: 3, u_content_button: 1, u_content_image: 1 },
      body: {
        id: "body",
        rows: [
          {
            id: "row-hero",
            cells: [1],
            columns: [
              {
                id: "col-hero",
                contents: [
                  {
                    id: "content-hero-img",
                    type: "image",
                    values: {
                      containerPadding: "0px",
                      anchor: "",
                      src: { url: "https://placehold.co/600x250/000000/ffffff?text=HERO+IMAGE", width: 600, height: 250 },
                      textAlign: "center",
                      altText: "Product Image",
                      action: { name: "web", values: { href: "", target: "_blank" } },
                      hideDesktop: false,
                      _meta: { htmlID: "u_content_image_1", htmlClassNames: "u_content_image" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                    },
                  },
                ],
                values: {
                  backgroundColor: "#000000",
                  padding: "0px",
                  _meta: { htmlID: "u_column_hero", htmlClassNames: "u_column" },
                },
              },
            ],
            values: {
              padding: "20px 10px 0px",
              _meta: { htmlID: "u_row_hero", htmlClassNames: "u_row" },
              selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
            },
          },
          {
            id: "row-body",
            cells: [1],
            columns: [
              {
                id: "col-body",
                contents: [
                  {
                    id: "content-title",
                    type: "text",
                    values: {
                      containerPadding: "30px 40px 10px",
                      textAlign: "left",
                      lineHeight: "120%",
                      _meta: { htmlID: "u_content_text_title", htmlClassNames: "u_content_text" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<p style="font-size: 28px; font-weight: 900; color: #000000; text-transform: uppercase;">Introducing Our Latest Innovation</p>',
                    },
                  },
                  {
                    id: "content-desc",
                    type: "text",
                    values: {
                      containerPadding: "10px 40px 20px",
                      textAlign: "left",
                      lineHeight: "170%",
                      _meta: { htmlID: "u_content_text_desc", htmlClassNames: "u_content_text" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<p style="font-size: 16px; color: #000000; font-weight: 500;">We\'re thrilled to share something new with you. Our team has been working hard to bring you the best quality products, and this one is no exception.</p><p style="font-size: 16px; color: #000000;">&nbsp;</p><p style="font-size: 16px; color: #000000; font-weight: 500;">{{campaignContent}}</p>',
                    },
                  },
                  {
                    id: "content-cta",
                    type: "button",
                    values: {
                      containerPadding: "10px 40px 30px",
                      href: { name: "web", values: { href: "{{ctaUrl}}", target: "_blank" } },
                      buttonColors: { color: "#ffffff", backgroundColor: "#000000", hoverColor: "#ffffff", hoverBackgroundColor: "#333333" },
                      size: { autoWidth: false, width: "100%" },
                      textAlign: "center",
                      lineHeight: "120%",
                      padding: "16px 40px",
                      _meta: { htmlID: "u_content_button_cta", htmlClassNames: "u_content_button" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<span style="font-size: 18px; font-weight: 800; text-transform: uppercase;">{{ctaText}}</span>',
                    },
                  },
                ],
                values: {
                  backgroundColor: "#ffffff",
                  padding: "0px",
                  _meta: { htmlID: "u_column_body", htmlClassNames: "u_column" },
                },
              },
            ],
            values: {
              padding: "0px 10px",
              _meta: { htmlID: "u_row_body", htmlClassNames: "u_row" },
              selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
            },
          },
          {
            id: "row-footer",
            cells: [1],
            columns: [
              {
                id: "col-footer",
                contents: [
                  {
                    id: "content-footer",
                    type: "text",
                    values: {
                      containerPadding: "20px 40px",
                      textAlign: "center",
                      lineHeight: "160%",
                      _meta: { htmlID: "u_content_text_footer", htmlClassNames: "u_content_text" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<p style="font-size: 12px; color: #666666; font-weight: 600;">{{brandName}} • <a href="{{unsubscribeUrl}}" style="color: #666666;">Unsubscribe</a></p>',
                    },
                  },
                ],
                values: { backgroundColor: "", padding: "0px", _meta: { htmlID: "u_column_footer", htmlClassNames: "u_column" } },
              },
            ],
            values: {
              padding: "10px",
              _meta: { htmlID: "u_row_footer", htmlClassNames: "u_row" },
              selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
            },
          },
        ],
        values: {
          backgroundColor: "#f4f4f5",
          width: "600px",
          fontFamily: { label: "Arial", value: "arial,helvetica,sans-serif" },
          contentWidth: "600px",
          contentAlign: "center",
          preheaderText: "Check out what's new!",
          linkStyle: { body: true, linkColor: "#000000", linkHoverColor: "#333333", linkUnderline: true, linkHoverUnderline: true },
          _meta: { htmlID: "u_body", htmlClassNames: "u_body" },
        },
      },
      schemaVersion: 16,
    },
  },
  {
    id: "sale-promotion",
    name: "Sale / Promotion",
    description: "Eye-catching promo with a bold CTA button",
    category: "promotion",
    thumbnail: "04",
    design: {
      counters: { u_row: 3, u_column: 3, u_content_text: 3, u_content_button: 1 },
      body: {
        id: "body",
        rows: [
          {
            id: "row-header",
            cells: [1],
            columns: [
              {
                id: "col-header",
                contents: [
                  {
                    id: "content-headline",
                    type: "text",
                    values: {
                      containerPadding: "40px 40px 15px",
                      textAlign: "center",
                      lineHeight: "130%",
                      _meta: { htmlID: "u_content_text_headline", htmlClassNames: "u_content_text" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<p style="font-size: 16px; text-transform: uppercase; letter-spacing: 4px; color: #000000; font-weight: 900; background-color: #FFC107; display: inline-block; padding: 5px 15px; border: 2px solid #000;">LIMITED TIME OFFER</p>',
                    },
                  },
                  {
                    id: "content-big-text",
                    type: "text",
                    values: {
                      containerPadding: "15px 40px 15px",
                      textAlign: "center",
                      lineHeight: "100%",
                      _meta: { htmlID: "u_content_text_big", htmlClassNames: "u_content_text" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<p style="font-size: 56px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: -2px;">UP TO 50% OFF</p>',
                    },
                  },
                  {
                    id: "content-sub",
                    type: "text",
                    values: {
                      containerPadding: "10px 40px 35px",
                      textAlign: "center",
                      lineHeight: "160%",
                      _meta: { htmlID: "u_content_text_sub", htmlClassNames: "u_content_text" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<p style="font-size: 18px; font-weight: 500; color: #000000;">Don\'t miss out on our biggest sale of the season. Shop our premium collection at unbeatable prices.</p>',
                    },
                  },
                  {
                    id: "content-promo-btn",
                    type: "button",
                    values: {
                      containerPadding: "0px 40px 50px",
                      href: { name: "web", values: { href: "{{ctaUrl}}", target: "_blank" } },
                      buttonColors: { color: "#ffffff", backgroundColor: "#000000", hoverColor: "#ffffff", hoverBackgroundColor: "#333333" },
                      size: { autoWidth: false, width: "100%" },
                      textAlign: "center",
                      lineHeight: "120%",
                      padding: "20px 30px",
                      _meta: { htmlID: "u_content_button_promo", htmlClassNames: "u_content_button" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<span style="font-size: 18px; font-weight: 900; text-transform: uppercase;">SHOP NOW →</span>',
                    },
                  },
                ],
                values: {
                  backgroundColor: "#ffffff",
                  padding: "0px",
                  _meta: { htmlID: "u_column_header", htmlClassNames: "u_column" },
                },
              },
            ],
            values: {
              padding: "20px 10px",
              _meta: { htmlID: "u_row_header", htmlClassNames: "u_row" },
              selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
            },
          },
          {
            id: "row-promo-footer",
            cells: [1],
            columns: [
              {
                id: "col-promo-footer",
                contents: [
                  {
                    id: "content-promo-footer",
                    type: "text",
                    values: {
                      containerPadding: "10px 40px",
                      textAlign: "center",
                      lineHeight: "160%",
                      _meta: { htmlID: "u_content_text_pfooter", htmlClassNames: "u_content_text" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<p style="font-size: 12px; color: #666666; font-weight: 600;">{{brandName}} • <a href="{{unsubscribeUrl}}" style="color: #666666;">Unsubscribe</a></p>',
                    },
                  },
                ],
                values: { backgroundColor: "", padding: "0px", _meta: { htmlID: "u_column_pfooter", htmlClassNames: "u_column" } },
              },
            ],
            values: {
              padding: "0px 10px 20px",
              _meta: { htmlID: "u_row_promo_footer", htmlClassNames: "u_row" },
              selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
            },
          },
        ],
        values: {
          backgroundColor: "#FFC107",
          width: "600px",
          fontFamily: { label: "Arial", value: "arial,helvetica,sans-serif" },
          contentWidth: "600px",
          contentAlign: "center",
          preheaderText: "Don't miss our biggest sale!",
          _meta: { htmlID: "u_body", htmlClassNames: "u_body" },
        },
      },
      schemaVersion: 16,
    },
  },
  {
    id: "simple-notification",
    name: "Simple Notification",
    description: "Clean, minimal notification email",
    category: "notification",
    thumbnail: "05",
    design: {
      counters: { u_row: 2, u_column: 2, u_content_text: 3 },
      body: {
        id: "body",
        rows: [
          {
            id: "row-notif",
            cells: [1],
            columns: [
              {
                id: "col-notif",
                contents: [
                  {
                    id: "content-notif-title",
                    type: "text",
                    values: {
                      containerPadding: "30px 40px 10px",
                      textAlign: "left",
                      lineHeight: "140%",
                      _meta: { htmlID: "u_content_text_ntitle", htmlClassNames: "u_content_text" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<p style="font-size: 24px; font-weight: 900; color: #000000; text-transform: uppercase;">{{campaignTitle}}</p>',
                    },
                  },
                  {
                    id: "content-notif-body",
                    type: "text",
                    values: {
                      containerPadding: "10px 40px 30px",
                      textAlign: "left",
                      lineHeight: "170%",
                      _meta: { htmlID: "u_content_text_nbody", htmlClassNames: "u_content_text" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<p style="font-size: 16px; font-weight: 500; color: #000000;">Hi {{name}},</p><p style="font-size: 16px; color: #000000;">&nbsp;</p><p style="font-size: 16px; font-weight: 500; color: #000000;">{{campaignContent}}</p><p style="font-size: 16px; color: #000000;">&nbsp;</p><p style="font-size: 16px; font-weight: 500; color: #000000;">Best regards,<br>The {{brandName}} Team</p>',
                    },
                  },
                ],
                values: {
                  backgroundColor: "#ffffff",
                  padding: "0px",
                  _meta: { htmlID: "u_column_notif", htmlClassNames: "u_column" },
                },
              },
            ],
            values: {
              padding: "20px 10px 0px",
              _meta: { htmlID: "u_row_notif", htmlClassNames: "u_row" },
              selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
            },
          },
          {
            id: "row-notif-footer",
            cells: [1],
            columns: [
              {
                id: "col-notif-footer",
                contents: [
                  {
                    id: "content-notif-footer",
                    type: "text",
                    values: {
                      containerPadding: "15px 40px",
                      textAlign: "center",
                      lineHeight: "160%",
                      _meta: { htmlID: "u_content_text_nfooter", htmlClassNames: "u_content_text" },
                      selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
                      text: '<p style="font-size: 12px; color: #666666; font-weight: 600;"><a href="{{unsubscribeUrl}}" style="color: #666666;">Unsubscribe</a> from these emails</p>',
                    },
                  },
                ],
                values: { backgroundColor: "", padding: "0px", _meta: { htmlID: "u_column_nfooter", htmlClassNames: "u_column" } },
              },
            ],
            values: {
              padding: "10px",
              _meta: { htmlID: "u_row_nfooter", htmlClassNames: "u_row" },
              selectable: true, draggable: true, duplicatable: true, deletable: true, hideable: true,
            },
          },
        ],
        values: {
          backgroundColor: "#f4f4f5",
          width: "600px",
          fontFamily: { label: "Arial", value: "arial,helvetica,sans-serif" },
          contentWidth: "600px",
          contentAlign: "center",
          preheaderText: "",
          _meta: { htmlID: "u_body", htmlClassNames: "u_body" },
        },
      },
      schemaVersion: 16,
    },
  },
]
