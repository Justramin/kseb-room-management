import type { NavigateAction } from 'react-big-calendar';

export default function CalendarToolbar(toolbar: any) {
    const goToBack = () => toolbar.onNavigate('PREV' as NavigateAction);
    const goToNext = () => toolbar.onNavigate('NEXT' as NavigateAction);
    const goToCurrent = () => toolbar.onNavigate('TODAY' as NavigateAction);

    return (
        <div className="rbc-toolbar custom-toolbar flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <div className="flex gap-2">
                <button type="button" onClick={goToBack} className="toolbar-btn text-bold">
                    &lt; Previous
                </button>
                <button type="button" onClick={goToCurrent} className="toolbar-btn" style={{ backgroundColor: 'var(--text-muted)' }}>
                    Today
                </button>
                <button type="button" onClick={goToNext} className="toolbar-btn text-bold">
                    Next &gt;
                </button>
            </div>
            <div className="rbc-toolbar-label" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)', textAlign: 'right' }}>
                {toolbar.label}
            </div>
        </div>
    );
}
