import SwiftUI

// SaglitzButton — primary / secondary / destructive with disabled + loading states.
// Meets the ≥44pt touch target, Dynamic Type, and respects Reduce Motion.

struct SaglitzButton: View {
    enum Variant { case primary, secondary, destructive }

    let title: String
    var variant: Variant = .primary
    var isLoading: Bool = false
    let action: () -> Void

    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Button(action: action) {
            ZStack {
                // Keep the label in the layout while loading so width never jumps.
                Text(title)
                    .fontWeight(.semibold)
                    .opacity(isLoading ? 0 : 1)

                if isLoading {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .tint(foreground)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 44) // 44pt minimum target
            .padding(.horizontal, 20)
        }
        .buttonStyle(SaglitzButtonStyle(variant: variant,
                                        foreground: foreground,
                                        background: background,
                                        border: border,
                                        reduceMotion: reduceMotion))
        .disabled(isLoading || !isEnabled)
        // Dim the whole control when non-interactive; never rely on color alone.
        .opacity((isLoading || !isEnabled) ? 0.5 : 1)
        .animation(reduceMotion ? nil : .spring(response: 0.3, dampingFraction: 0.7),
                   value: isLoading)
        .accessibilityLabel(title)
        .accessibilityAddTraits(.isButton)
        // Announce loading to assistive tech instead of silently disabling.
        .accessibilityValue(isLoading ? Text("Loading") : Text(""))
        .accessibilityHint(variant == .destructive ? "Destructive action" : "")
    }

    // MARK: Variant colors (system colors adapt to light/dark + contrast settings)
    private var foreground: Color {
        switch variant {
        case .primary, .destructive: return .white
        case .secondary: return .accentColor
        }
    }
    private var background: Color {
        switch variant {
        case .primary: return .accentColor
        case .secondary: return .clear
        case .destructive: return .red
        }
    }
    private var border: Color? {
        variant == .secondary ? .accentColor : nil
    }
}

private struct SaglitzButtonStyle: ButtonStyle {
    let variant: SaglitzButton.Variant
    let foreground: Color
    let background: Color
    let border: Color?
    let reduceMotion: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(foreground)
            .background(background, in: .capsule) // Capsule reads well with Liquid Glass
            .overlay {
                if let border {
                    Capsule().strokeBorder(border, lineWidth: 1.5)
                }
            }
            // Press feedback: subtle scale + opacity spring.
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.96 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(reduceMotion ? nil : .spring(response: 0.3, dampingFraction: 0.6),
                       value: configuration.isPressed)
    }
}

#Preview {
    VStack(spacing: 16) {
        SaglitzButton(title: "Save changes", variant: .primary) {}
        SaglitzButton(title: "Cancel", variant: .secondary) {}
        SaglitzButton(title: "Delete project", variant: .destructive) {}
        SaglitzButton(title: "Saving", variant: .primary, isLoading: true) {}
        SaglitzButton(title: "Unavailable", variant: .primary) {}.disabled(true)
    }
    .padding()
}
