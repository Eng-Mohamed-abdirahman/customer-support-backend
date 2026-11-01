import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      // Simple email format check for cleaner persisted data.
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      // Never return password hash by default in queries.
      select: false,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },
    role: {
      type: String,
      // Roles are strictly limited to platform + tenant roles only.
      enum: ["admin", "company-admin", "staff"],
      default: "staff",
      required: true,
    },
    invitationToken: {
      type: String,
    },
    invitationExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Role meaning:
// - admin: platform admin (can create companies and first company-admin).
// - company-admin: company-level admin.
// - staff: normal company user.
userSchema.path("company").validate(function (this: any, value: unknown) {
  const hasCompany = Boolean(value);

  // Platform admins are not tenant-bound, so company must stay null.
  if (this.role === "admin") {
    return !hasCompany;
  }

  // company-admin and staff must belong to exactly one company.
  return hasCompany;
}, "admin may have company = null, but company-admin/staff must belong to one company");

userSchema.pre("validate", function (this: any) {
  // Enforce tenant isolation by never attaching platform admins to a company.
  if (this.role === "admin") {
    this.company = null;
  }
});

// Controller flow rule for company-admin user creation:
// Never trust companyId from req.body. Always set newUser.company = req.user.company.
export default mongoose.model("User", userSchema);

