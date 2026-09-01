import SwiftUI

// SaglitzSwitch — instant-effect setting. The Toggle owns the accessible name
// and on/off state. Visible track is smaller than the 44pt hit area.

struct SaglitzSwitch: View {
    let label: String
    var description: String? = nil
    @Binding var isOn: Bool

    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Toggle(isOn: $isOn) {
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                if let description {
                    Text(description)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .toggleStyle(.switch)
        .frame(minHeight: 44)
        .opacity(isEnabled ? 1 : 0.5)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.15), value: isOn)
        .accessibilityHint(description ?? "")
    }
}

#Preview {
    Form {
        SaglitzSwitch(label: "Email notifications", description: "Project updates and mentions", isOn: .constant(true))
        SaglitzSwitch(label: "Unavailable", isOn: .constant(false)).disabled(true)
    }
}
