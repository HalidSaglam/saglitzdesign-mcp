import SwiftUI

// SaglitzTextField — labeled field with placeholder, error state, and correct
// keyboard/content-type wiring. Scales with Dynamic Type; border animates with a
// spring (skipped under Reduce Motion).

struct SaglitzTextField: View {
    enum Kind { case plain, email, password, phone }

    let label: String
    var placeholder: String = ""
    @Binding var text: String
    var kind: Kind = .plain
    var errorMessage: String? = nil

    @FocusState private var isFocused: Bool
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var isError: Bool { errorMessage != nil }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)

            field
                .textFieldStyle(.plain)
                .font(.body) // body scales with Dynamic Type
                .frame(minHeight: 44) // ≥44pt target
                .padding(.horizontal, 14)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(.secondarySystemBackground))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(borderColor, lineWidth: isFocused || isError ? 2 : 1)
                )
                .focused($isFocused)
                .animation(reduceMotion ? nil : .spring(response: 0.25, dampingFraction: 0.8),
                           value: isFocused)
                .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: isError)

            if let errorMessage {
                Label(errorMessage, systemImage: "exclamationmark.circle.fill")
                    .font(.footnote)
                    .foregroundStyle(.red) // icon + text so it is never color-only
                    .labelStyle(.titleAndIcon)
            }
        }
        .opacity(isEnabled ? 1 : 0.5)
        // Group label + field + error into one accessibility element.
        .accessibilityElement(children: .combine)
        .accessibilityLabel(label)
        .accessibilityValue(text.isEmpty ? Text(placeholder) : Text(text))
        .accessibilityHint(errorMessage.map { Text($0) } ?? Text(""))
    }

    @ViewBuilder private var field: some View {
        switch kind {
        case .password:
            SecureField(placeholder, text: $text)
                .textContentType(.password)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
        case .email:
            TextField(placeholder, text: $text)
                .keyboardType(.emailAddress)
                .textContentType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
        case .phone:
            TextField(placeholder, text: $text)
                .keyboardType(.phonePad)
                .textContentType(.telephoneNumber)
        case .plain:
            TextField(placeholder, text: $text)
        }
    }

    private var borderColor: Color {
        if isError { return .red }
        if isFocused { return .accentColor }
        return Color(.separator)
    }
}

#Preview {
    @Previewable @State var email = ""
    @Previewable @State var pw = ""
    return VStack(spacing: 20) {
        SaglitzTextField(label: "Work email", placeholder: "you@company.com",
                         text: $email, kind: .email)
        SaglitzTextField(label: "Password", placeholder: "Enter password",
                         text: $pw, kind: .password,
                         errorMessage: "Must be at least 8 characters")
    }
    .padding()
}
