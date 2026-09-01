import SwiftUI

// SaglitzToast — overlay banner. Never steals focus. Auto-dismisses; errors
// linger longer. Pause the timer while VoiceOver is running or the toast is
// hovered. Icon + text so colour is never the only signal.

enum SaglitzToastKind { case success, error, info }

struct SaglitzToast: Identifiable, Equatable {
    let id = UUID()
    let kind: SaglitzToastKind
    let message: String
    var duration: TimeInterval {
        kind == .error ? 8 : 5
    }
}

struct SaglitzToastBanner: View {
    let toast: SaglitzToast
    var onDismiss: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(tint)
                .accessibilityHidden(true)
            Text(toast.message)
                .font(.subheadline)
                .frame(maxWidth: .infinity, alignment: .leading)
            Button("Dismiss notification", systemImage: "xmark") { onDismiss() }
                .labelStyle(.iconOnly)
                .frame(minWidth: 44, minHeight: 44)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(tint.opacity(0.35), lineWidth: 1))
        .accessibilityAddTraits(.isStaticText)
        .accessibilityLabel(toast.message)
        .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
        .task(id: toast.id) {
            guard !voiceOver else { return } // linger while VoiceOver is speaking
            try? await Task.sleep(for: .seconds(toast.duration))
            onDismiss()
        }
    }

    private var icon: String {
        switch toast.kind {
        case .success: return "checkmark.circle.fill"
        case .error: return "exclamationmark.triangle.fill"
        case .info: return "info.circle.fill"
        }
    }

    private var tint: Color {
        switch toast.kind {
        case .success: return .green
        case .error: return .red
        case .info: return .accentColor
        }
    }
}

#Preview {
    VStack {
        SaglitzToastBanner(toast: .init(kind: .success, message: "Project saved"), onDismiss: {})
        SaglitzToastBanner(toast: .init(kind: .error, message: "Could not reach the server"), onDismiss: {})
    }
    .padding()
}
