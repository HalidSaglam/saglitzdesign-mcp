import SwiftUI
import UIKit

struct ContentView: View {
    var body: some View {
        NavigationView {
            VStack {
                Text("Ledger")
                    .font(.system(size: 17))
                Rectangle()
                    .fill(Color(red: 0.10, green: 0.20, blue: 0.30))
                Button(action: refresh) {
                    Image(systemName: "arrow.clockwise")
                }
            }
        }
    }

    private func refresh() {}
}
