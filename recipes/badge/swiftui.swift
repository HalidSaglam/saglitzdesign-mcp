import SwiftUI

enum SaglitzBadgeTone { case neutral, accent, danger }

struct SaglitzBadge: View {
    var tone: SaglitzBadgeTone = .neutral
    var count: Int? = nil
    let label: String

    var body: some View {
        HStack(spacing: 4) {
            Text(label)
            if let count {
                Text("\(count)")
                    .font(.subheadline.monospacedDigit())
            }
        }
        .font(.subheadline.weight(.medium))
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .foregroundStyle(foreground)
        .background(background, in: Capsule())
        .accessibilityElement(children: .combine)
    }

    private var background: Color {
        switch tone {
        case .neutral: return Color(.tertiarySystemFill)
        case .accent: return Color.accentColor.opacity(0.15)
        case .danger: return Color.red.opacity(0.15)
        }
    }

    private var foreground: Color {
        switch tone {
        case .neutral: return .primary
        case .accent: return .accentColor
        case .danger: return .red
        }
    }
}

#Preview {
    HStack {
        SaglitzBadge(label: "Draft")
        SaglitzBadge(tone: .accent, count: 3, label: "Due")
        SaglitzBadge(tone: .danger, label: "Overdue")
    }
    .padding()
}
