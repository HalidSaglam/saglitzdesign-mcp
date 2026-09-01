import SwiftUI

// SaglitzTabs — peer views of one context. Selection is a underline (shape,
// not colour alone) plus `accessibilityAddTraits(.isSelected)`. Arrow keys
// via the system TabView; each page is its own accessibility container.

struct SaglitzTab: Identifiable, Hashable {
    let id: String
    let label: String
    var disabled: Bool = false
}

struct SaglitzTabs<Content: View>: View {
    let tabs: [SaglitzTab]
    @Binding var selection: String
    @ViewBuilder var content: (String) -> Content

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                ForEach(tabs) { tab in
                    Button {
                        selection = tab.id
                    } label: {
                        VStack(spacing: 8) {
                            Text(tab.label)
                                .font(.subheadline.weight(selection == tab.id ? .semibold : .regular))
                                .frame(maxWidth: .infinity, minHeight: 44)
                            Rectangle()
                                .fill(selection == tab.id ? Color.accentColor : Color.clear)
                                .frame(height: 2)
                        }
                    }
                    .buttonStyle(.plain)
                    .disabled(tab.disabled)
                    .opacity(tab.disabled ? 0.4 : 1)
                    .accessibilityAddTraits(selection == tab.id ? [.isSelected] : [])
                    .accessibilityLabel(tab.label)
                }
            }
            .overlay(alignment: .bottom) {
                Rectangle().fill(Color.secondary.opacity(0.3)).frame(height: 1)
            }
            content(selection)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: selection)
        }
    }
}

#Preview {
    SaglitzTabs(
        tabs: [
            .init(id: "overview", label: "Overview"),
            .init(id: "activity", label: "Activity"),
            .init(id: "settings", label: "Settings", disabled: true),
        ],
        selection: .constant("overview"),
        content: { id in Text(id).padding() }
    )
}
