import SwiftUI

// SaglitzCard — a tappable content container: title / subtitle / trailing accessory.
// Border OR shadow, never both. The whole card is one accessibility element and one
// tap target; press feedback is a subtle spring scale.

struct SaglitzCard<Trailing: View>: View {
    let title: String
    var subtitle: String? = nil
    var action: (() -> Void)? = nil
    @ViewBuilder var trailing: () -> Trailing

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        if let action {
            Button(action: action) { content }
                .buttonStyle(CardButtonStyle(reduceMotion: reduceMotion))
                // Merge children so VoiceOver reads the card as one navigable element.
                .accessibilityElement(children: .combine)
                .accessibilityAddTraits(.isButton)
        } else {
            content
                .accessibilityElement(children: .combine)
        }
    }

    private var content: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .lineLimit(2) // stable height in a grid/list
                if let subtitle {
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }
            }
            Spacer(minLength: 0)
            trailing()
                .foregroundStyle(.secondary)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous) // continuous = iOS "squircle"
                .fill(Color(.secondarySystemGroupedBackground))
        )
        // Elevation (shadow) chosen over a border — never both.
        .shadow(color: .black.opacity(0.08), radius: 8, y: 2)
    }
}

// Convenience initializer for the common chevron-trailing case.
extension SaglitzCard where Trailing == Image {
    init(title: String, subtitle: String? = nil, action: @escaping () -> Void) {
        self.init(title: title, subtitle: subtitle, action: action) {
            Image(systemName: "chevron.right")
        }
    }
}

private struct CardButtonStyle: ButtonStyle {
    let reduceMotion: Bool
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1)
            .opacity(configuration.isPressed ? 0.95 : 1)
            .animation(reduceMotion ? nil : .spring(response: 0.3, dampingFraction: 0.7),
                       value: configuration.isPressed)
    }
}

#Preview {
    VStack(spacing: 16) {
        SaglitzCard(title: "Billing & plans",
                    subtitle: "Manage your subscription and payment methods") {}
        SaglitzCard(title: "Read-only note",
                    subtitle: "No action attached to this card") {
            EmptyView()
        }
    }
    .padding()
    .background(Color(.systemGroupedBackground))
}
