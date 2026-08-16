import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            List {
                Text("Receipts")
                    .font(.headline)
                Text("Everything you filed this month.")
                    .font(.body)
            }
            .navigationTitle("Receipts")
        }
    }
}
