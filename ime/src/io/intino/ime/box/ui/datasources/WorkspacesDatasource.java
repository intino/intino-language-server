package io.intino.ime.box.ui.datasources;

import io.intino.alexandria.ui.model.datasource.Filter;
import io.intino.alexandria.ui.model.datasource.Group;
import io.intino.alexandria.ui.model.datasource.PageDatasource;
import io.intino.alexandria.ui.services.push.UISession;
import io.intino.ime.box.ImeBox;
import io.intino.ime.box.workspaces.WorkspaceManager;
import io.intino.ime.model.Workspace;

import java.util.List;

import static java.util.stream.Collectors.toList;

public class WorkspacesDatasource extends PageDatasource<Workspace> {
	protected final ImeBox box;
	protected final UISession session;
	private final Boolean onlyPrivate;
	private String condition;
	private List<Filter> filters;

	public WorkspacesDatasource(ImeBox box, UISession session, Boolean onlyPrivate) {
		this.box = box;
		this.session = session;
		this.onlyPrivate = onlyPrivate;
	}

	public long itemCount() {
		return itemCount(condition, filters);
	}

	@Override
	public List<Workspace> items(int start, int count, String condition, List<Filter> filters, List<String> sortings) {
		saveParameters(condition, filters);
		List<Workspace> result = sort(load(condition, filters), sortings);
		int from = Math.min(start, result.size());
		int end = Math.min(start + count, result.size());
		return result.subList(from, end);
	}

	@Override
	public long itemCount(String condition, List<Filter> filters) {
		return load(condition, filters).size();
	}

	@Override
	public List<Group> groups(String key) {
		return List.of();
	}

	protected List<Workspace> load() {
		WorkspaceManager manager = box.workspaceManager();
		String username = username();
		if (onlyPrivate == null) return manager.ownerWorkspaces(username);
		return onlyPrivate ? manager.privateWorkspaces(username) : manager.publicWorkspaces(username);
	}

	protected String username() {
		return session.user() != null ? session.user().username() : "Anonymous";
	}

	private List<Workspace> load(String condition, List<Filter> filters) {
		List<Workspace> workspaces = load();
		workspaces = filterCondition(workspaces, condition);
		return workspaces;
	}

	private List<Workspace> filterCondition(List<Workspace> workspaces, String condition) {
		if (condition == null || condition.isEmpty()) return workspaces;
		String[] conditions = condition.toLowerCase().split(" ");
		return workspaces.stream().filter(w ->
				DatasourceHelper.matches(w.name(), conditions) ||
				DatasourceHelper.matches(w.title(), conditions) ||
				DatasourceHelper.matches(w.owner().name(), conditions) ||
				DatasourceHelper.matches(w.owner().fullName(), conditions) ||
				DatasourceHelper.matches(w.language(), conditions)
		).collect(toList());
	}

	private List<Workspace> sort(List<Workspace> workspaces, List<String> sortings) {
		return workspaces.stream().sorted((o1, o2) -> o2.lastModifyDate().compareTo(o1.lastModifyDate())).toList();
	}

	private void saveParameters(String condition, List<Filter> filters) {
		this.condition = condition;
		this.filters = filters;
	}

}
