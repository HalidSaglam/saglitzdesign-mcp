import SwiftUI

// SaglitzEmptyState — visual → headline → explanation → one CTA.
// Three variants: first-use, no-results (echoes the query as text, never HTML),
// and error (role: status via accessibilityAddTraits).

enum SaglitzEmptyKind { case firstUse, noResults, error }

struct SaglitzEmptyState: View {
    var kind: SaglitzEmptyKind = .firstUse
    var icon: String = "tray"
    var headline: String
    var description: String
    var ctaTitle: String
    var action: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.largeTitle)
                .foregroundStyle(.secondary)
                .accessibilityHidden(true)
            Text(headline)
                .font(.title3.weight(.semibold))
                .multilineTextAlignment(.center)
            Text(description)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button(ctaTitle, action: action)
                .buttonStyle(.borderedProminent)
                .frame(minHeight: 44)
        }
        .frame(maxWidth: 360)
        .padding(.horizontal, 24)
        .padding(.vertical, 48)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .opacity(1)
        .offset(y: 0)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: headline)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(kind == .error ? .updatesFrequently : [])
        .accessibilityHeading(.h2)
    }
}

#Preview {
    VStack {
        SaglitzEmptyState(
            kind: .firstUse,
            icon: "folder.badge.plus",
            headline: "Create your first project",
            description: "Projects keep your work organized. Start with one and invite your team later.",
            ctaTitle: "New project",
            action: {}
        )
    }
}
