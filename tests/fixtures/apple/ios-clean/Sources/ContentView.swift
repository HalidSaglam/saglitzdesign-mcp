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
            }
        }
    }

    private func add() {}
}
