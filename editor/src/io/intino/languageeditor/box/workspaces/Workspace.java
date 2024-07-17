package io.intino.languageeditor.box.workspaces;

import java.time.Instant;

public class Workspace {
	public String name;
	public String title;
	public User owner;
	public Instant lastModifyDate;

	public String name() {
		return name;
	}

	public Workspace name(String name) {
		this.name = name;
		return this;
	}

	public String title() {
		return title;
	}

	public Workspace title(String title) {
		this.title = title;
		return this;
	}

	public User owner() {
		return owner;
	}

	public Workspace owner(User owner) {
		this.owner = owner;
		return this;
	}

	public Instant lastModifyDate() {
		return lastModifyDate;
	}

	public Workspace lastModifyDate(Instant lastModifyDate) {
		this.lastModifyDate = lastModifyDate;
		return this;
	}

	public static class User {
		private String name;
		private String fullName;

		public String name() {
			return name;
		}

		public User name(String name) {
			this.name = name;
			return this;
		}

		public String fullName() {
			return fullName;
		}

		public User fullName(String fullName) {
			this.fullName = fullName;
			return this;
		}
	}

}
