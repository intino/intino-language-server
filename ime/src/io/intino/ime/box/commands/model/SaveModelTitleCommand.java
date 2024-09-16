package io.intino.ime.box.commands.model;

import io.intino.ime.box.ImeBox;
import io.intino.ime.box.commands.Command;
import io.intino.ime.model.Model;

public class SaveModelTitleCommand extends Command<Boolean> {
	public Model model;
	public String title;

	public SaveModelTitleCommand(ImeBox box) {
		super(box);
	}

	@Override
	public Boolean execute() {
		if (title.equals(model.title())) return true;
		model.title(title);
		box.modelManager().save(model);
		return true;
	}

}
