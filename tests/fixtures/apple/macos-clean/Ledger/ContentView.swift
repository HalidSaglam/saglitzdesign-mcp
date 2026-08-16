import SwiftUI
import AppKit

struct ContentView: View {
    @State private var selection: String?

    var body: some View {
        NavigationSplitView {
            List(selection: $selection) {
                // 13pt is the macOS system font size, and macOS has no Dynamic
                // Type for it to scale against. The identical line on an iOS
                // target draws `fixed-font-size`; here it is correct.
                Text("Receipts")
                    .font(.system(size: 13))
                Text("Archive")
                    .font(.system(size: 13))
            }
            .navigationSplitViewColumnWidth(min: 180, ideal: 200)
        } detail: {
            Text("Pick a receipt")
                .foregroundStyle(Color(nsColor: .secondaryLabelColor))
        }
        .toolbar {
            // The same correctly-written icon-only button as `ios-clean`, with
            // the spoken name written on the `Button` instead of on the symbol
            // — the other position the rule accepts. Remove the
            // `.accessibilityLabel` and `symbol-as-only-button-label` fires.
            Button {
                refresh()
            } label: {
                Image(systemName: "arrow.clockwise")
            }
            .accessibilityLabel("Refresh receipts")
        }
    }

    private func refresh() {}
}
