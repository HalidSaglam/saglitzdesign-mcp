import SwiftUI

// SaglitzTabBar — 3–5 top-level destinations. Labels always visible.
// Selection is the system filled icon plus accessibilityAddTraits(.isSelected).
// Each tab owns its own NavigationStack so switching preserves position.

struct SaglitzTab: Identifiable, Hashable {
    let id: String
    let label: String
    let systemImage: String
}

struct SaglitzTabBar<Content: View>: View {
    let tabs: [SaglitzTab]
    @Binding var selection: String
    @ViewBuilder var content: (String) -> Content

    var body: some View {
        TabView(selection: $selection) {
            ForEach(tabs) { tab in
                NavigationStack {
                    content(tab.id)
                }
                .tabItem {
                    Label(tab.label, systemImage: tab.systemImage)
                }
                .tag(tab.id)
                .accessibilityAddTraits(selection == tab.id ? [.isSelected] : [])
            }
        }
    }
}

#Preview {
    SaglitzTabBar(
        tabs: [
            .init(id: "home", label: "Home", systemImage: "house"),
            .init(id: "inbox", label: "Inbox", systemImage: "tray"),
            .init(id: "settings", label: "Settings", systemImage: "gearshape"),
        ],
        selection: .constant("home"),
        content: { id in Text(id).frame(minHeight: 44) }
    )
}
