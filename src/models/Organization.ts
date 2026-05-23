const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    // System-controlled
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["trialing", "active", "suspended", "cancelled"],
      default: "trialing",
      index: true,
    },

    // Editable by company admin
    profile: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      logoUrl: {
        type: String,
        trim: true,
        default: "",
      },
      websiteUrl: {
        type: String,
        trim: true,
        default: "",
      },
      businessType: {
        type: String,
        trim: true,
        default: "",
      },
      description: {
        type: String,
        trim: true,
        default: "",
      },
    },
    contact: {
      supportEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
        default: "",
      },
      address: {
        type: String,
        trim: true,
        default: "",
      },
    },
    businessInfo: {
      workingHours: {
        type: String,
        trim: true,
        default: "",
      },
      services: {
        type: String,
        trim: true,
        default: "",
      },
      products: {
        type: String,
        trim: true,
        default: "",
      },
      policies: {
        type: String,
        trim: true,
        default: "",
      },
      location: {
        type: String,
        trim: true,
        default: "",
      },
    },
    supportSettings: {
      fallbackMessage: {
        type: String,
        trim: true,
        default: "Our team will get back to you shortly.",
      },
      timezone: {
        type: String,
        trim: true,
        default: "Africa/Mogadishu",
      },
      language: {
        type: String,
        trim: true,
        default: "en",
      },
    },

    knowledgeBaseReference: {
      type: String,
      trim: true,
      default: "",
    },

    // System/admin controlled
    aiSettings: {
      aiEnabled: {
        type: Boolean,
        default: true,
      },
      autoReplyEnabled: {
        type: Boolean,
        default: true,
      },
      humanHandoffEnabled: {
        type: Boolean,
        default: true,
      },
      modelName: {
        type: String,
        trim: true,
        default: "gpt-4o-mini",
      },
    },
    allowedChannels: {
      type: [String],
      default: ["website"],
    },
    api_settings: {
      encrypted_key: {
        type: String,
        select: false,
      },
      iv: {
        type: String,
        select: false,
      },
      key_prefix: {
        type: String,
        trim: true,
        index: true,
        default: "",
      },
      total_tokens_used: {
        type: Number,
        default: 0,
        min: 0,
      },
      monthly_limit: {
        type: Number,
        default: 10000,
        min: 0,
      },
      last_key_rotated_at: {
        type: Date,
        default: null,
      },
    },
    api_keys: [
      {
        name: {
          type: String,
          trim: true,
          default: "Primary",
        },
        key_prefix: {
          type: String,
          trim: true,
          default: "",
        },
        encrypted_key: {
          type: String,
          select: false,
        },
        iv: {
          type: String,
          select: false,
        },
        created_at: {
          type: Date,
          default: Date.now,
        },
        last_used_at: {
          type: Date,
          default: null,
        },
        last_revealed_at: {
          type: Date,
          default: null,
        },
        revoked_at: {
          type: Date,
          default: null,
        },
      },
    ],
    subscription: {
      plan: {
        type: String,
        trim: true,
        default: "free",
      },
      stripeCustomerId: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Internal/system fields
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      index: true,
      select: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

organizationSchema.pre("validate", function (this: any) {
  if (this.profile && typeof this.profile.name === "string") {
    this.profile.name = this.profile.name.trim();
    this.normalizedName = this.profile.name.toLowerCase();
  }

  if (this.contact && typeof this.contact.supportEmail === "string") {
    this.contact.supportEmail = this.contact.supportEmail.trim().toLowerCase();
  }
});

module.exports = mongoose.model("Organization", organizationSchema);

export {};
