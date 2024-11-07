package io.intino.ime.box.commands;

import io.intino.builderservice.schemas.Message;
import io.intino.ime.box.ImeBox;
import io.intino.ime.box.orchestator.BuildException;
import io.intino.ime.model.Model;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

public abstract class Command<T> {
	public final ImeBox box;
	public String author;
	public Instant ts;

	private static final String EventSource = "UI";

	public Command(ImeBox box) {
		this.box = box;
	}

	public abstract T execute() throws BuildException;

	protected static Instant ts() {
		return Instant.now(Clock.systemUTC());
	}

	protected String author() {
		return this.author != null ? this.author : Model.DefaultOwner;
	}

	public interface ExecutionResult {
		boolean success();
		List<Message> messages();

		static ExecutionResult build(List<Message> messages) {
			return new ExecutionResult() {
				@Override
				public boolean success() {
					return messages.stream().noneMatch(m -> m.kind() == Message.Kind.ERROR);
				}

				@Override
				public List<Message> messages() {
					return messages;
				}
			};
		}
	}

}