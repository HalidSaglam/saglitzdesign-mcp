import SwiftUI

// SaglitzSignupForm — labeled fields, one announced error, marketing toggle off.
// Native Form chrome; do not restyle this into a web card.

struct SaglitzSignupForm: View {
    @State private var email = ""
    @State private var company = ""
    @State private var password = ""
    @State private var updates = false
    @State private var passwordError: String? = "Password must be at least 8 characters."

    var body: some View {
        Form {
            Section {
                TextField("Work email", text: $email)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .frame(minHeight: 44)
                TextField("Company (optional)", text: $company)
                    .textContentType(.organizationName)
                    .frame(minHeight: 44)
                SecureField("Password", text: $password)
                    .textContentType(.newPassword)
                    .frame(minHeight: 44)
                    .accessibilityHint(passwordError.map { Text($0) } ?? Text(""))
                if let passwordError {
                    Label(passwordError, systemImage: "exclamationmark.circle.fill")
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .accessibilityAddTraits(.isStaticText)
                }
            }
            Section {
                Toggle("Email me product updates", isOn: $updates)
                    .frame(minHeight: 44)
            } footer: {
                Text("Off by default. You can unsubscribe any time.")
            }
            Button("Create account") {
                passwordError = password.count < 8 ? "Password must be at least 8 characters." : nil
            }
            .frame(minHeight: 44)
        }
        .navigationTitle("Create account")
    }
}

#Preview {
    NavigationStack { SaglitzSignupForm() }
}
