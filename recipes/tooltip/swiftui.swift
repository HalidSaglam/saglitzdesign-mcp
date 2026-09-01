import SwiftUI

// SaglitzHelpButton — `.help` is the pointer tooltip. The control still has
// an accessibility label of its own; the tooltip must not be the only name.
// Reduce Motion skips the system help pop delay.

struct SaglitzHelpButton: View {
    var action: () -> Void = {}

    var body: some View {
        Button(action: action) {
            Image(systemName: "square.and.arrow.down")
                .frame(minWidth: 44, minHeight: 44)
        }
        .accessibilityLabel("Download CSV")
        .help("Download CSV")
        .buttonStyle(.borderless)
        .foregroundStyle(.tint)
    }
}

#Preview {
    SaglitzHelpButton()
        .padding()
}
