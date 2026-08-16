import SwiftUI
import UIKit

struct ContentView: View {
    @State private var query = ""

    var body: some View {
        NavigationStack {
            List {
                Text("Receipts")
                    .font(.headline)
                    .foregroundStyle(Color("Brand"))
                Text("Everything you filed this month.")
                    .font(.body)
            }
            .navigationTitle("Receipts")
            .toolbar {
                Button("Add receipt", systemImage: "plus") { add() }
                // An icon-only button, written correctly: the label is one
                // SF Symbol and the name VoiceOver speaks is written rather
                // than derived from it. Remove the `.accessibilityLabel` and
                // `symbol-as-only-button-label` fires on this line.
                Button {
                    refresh()
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .accessibilityLabel("Refresh receipts")
                }
            }
        }
    }

    private func add() {}

    private func refresh() {}
}
