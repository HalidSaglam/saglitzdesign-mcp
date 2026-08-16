import SwiftUI
import UIKit

struct ContentView: View {
    var body: some View {
        NavigationView {
            VStack {
                Text("Ledger")
                    .font(.system(size: 17))
                    .foregroundStyle(Color("Brand"))
                Button(action: refresh) {
                    Image(systemName: "arrow.clockwise")
                }
            }
            .navigationTitle("Ledger")
        }
    }

    private func refresh() {}
}
