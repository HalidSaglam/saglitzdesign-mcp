import SwiftUI

// SaglitzListRow — settings-row grammar for use inside a `List`.
// Two mutually exclusive trailing accessories: a navigation chevron OR a control
// (switch / value). Never both. Icon + title align via a fixed leading column.

// MARK: Navigation row (whole row taps, pushes a screen)
struct SaglitzNavigationRow<Destination: View>: View {
    let icon: String
    let title: String
    var subtitle: String? = nil
    @ViewBuilder let destination: () -> Destination

    var body: some View {
        NavigationLink(destination: destination) { // NavigationLink supplies the chevron
            RowLabel(icon: icon, title: title, subtitle: subtitle)
        }
        .frame(minHeight: 44)
        .accessibilityElement(children: .combine)
    }
}

// MARK: Switch row (only the toggle interacts; row is not a nav target)
struct SaglitzToggleRow: View {
    let icon: String
    let title: String
    var subtitle: String? = nil
    @Binding var isOn: Bool

    var body: some View {
        // Toggle owns the interaction and the accessible name/state.
        Toggle(isOn: $isOn) {
            RowLabel(icon: icon, title: title, subtitle: subtitle)
        }
        .frame(minHeight: 44)
        .accessibilityLabel(title)
    }
}

// MARK: Value row (leading title, trailing detail + chevron — one navigation target)
struct SaglitzValueRow<Destination: View>: View {
    let icon: String
    let title: String
    let value: String
    @ViewBuilder let destination: () -> Destination

    var body: some View {
        NavigationLink(destination: destination) {
            HStack {
                RowLabel(icon: icon, title: title, subtitle: nil)
                Spacer(minLength: 8)
                Text(value)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(minHeight: 44)
        .accessibilityElement(children: .combine)
        .accessibilityValue(value)
    }
}

private struct RowLabel: View {
    let icon: String
    let title: String
    let subtitle: String?

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(.tint)
                .frame(width: 28, alignment: .center) // fixed column aligns titles
                .accessibilityHidden(true) // icon is decorative; title carries meaning
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                if let subtitle {
                    Text(subtitle)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        List {
            SaglitzNavigationRow(icon: "person.circle", title: "Account",
                                 subtitle: "Profile, security") { Text("Account") }
            SaglitzToggleRow(icon: "bell", title: "Notifications", isOn: .constant(true))
            SaglitzValueRow(icon: "globe", title: "Language", value: "English") { Text("Language") }
        }
        .navigationTitle("Settings")
    }
}
